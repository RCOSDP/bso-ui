import Axios from 'axios';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

// import { ES_API_URL, HEADERS } from '../../../../../config/config';
import { ES_API_URL } from '../../../../../config/config';
// import getFetchOptions from '../../../../../utils/chartFetchOptions';
import {
    capitalize,
    getCSSValue,
} from '../../../../../utils/helpers';

function useGetDataTest(beforeLastObservationSnap, lastObservationSnap, domain) {
    const [data, setData] = useState({});
    const [isLoading, setLoading] = useState(true);
    const [isError, setError] = useState(false);
    const intl = useIntl();
    const bsoDomain = intl.formatMessage({ id: `app.bsoDomain.${domain}` });

    async function getDataByObservationSnaps() {
        // 1回目のクエリ 最新のcalc_dateを取得
        const latestDateRes = await Axios.post(ES_API_URL, {
            size: 0,
            aggs: {
                unique_calc_dates: {
                    terms: {
                        field: 'calc_date',
                        size: 10000,
                    },
                },
            },
            query: {
                term: {
                    data_type: 'archives.dynamique-ouverture.get-data',
                },
            },
        });

        // ユニークな `calc_date` のリストを取得
        const yearMonthDayList = latestDateRes.data.aggregations.unique_calc_dates.buckets.map(
            (bucket) => bucket.key_as_string.slice(0, 10),
        );

        const yearGroups = yearMonthDayList.reduce((acc, date) => {
            const year = date.slice(0, 4);
            if (!acc[year]) acc[year] = [];
            acc[year].push(date);
            return acc;
        }, {});
        const lastDateOfYear = [];

        // 各年のデータから最終日を取得
        Object.keys(yearGroups).forEach((year) => {
            /* eslint-enable arrow-parens, no-confusing-arrow */
            const yearDates = yearGroups[year];
            const lastDate = yearDates.reduce((latest, current) => (current > latest ? current : latest));
            lastDateOfYear.push(lastDate);
        });
        lastDateOfYear.sort((a, b) => new Date(b) - new Date(a));

        // 「日本のリポジトリ」の数値を取得
        const jaRes = await Axios.post(ES_API_URL, {
            size: 0,
            query: {
                bool: {
                    filter: [
                        { terms: { calc_date: lastDateOfYear } },
                        { term: { data_type: 'archives.dynamique-ouverture.get-data' } },
                        { term: { repository: 'ja-repository' } },
                    ],
                },
            },
            aggs: {
                by_calc_date: {
                    terms: { field: 'calc_date', size: 1, order: { _key: 'desc' } },
                    aggs: {
                        nested_data: {
                            nested: { path: 'data' },
                            aggs: {
                                total_per_year: {
                                    terms: { field: 'data.publication_year', size: 1000 },
                                    aggs: { oa_sum: { sum: { field: 'data.oa' } } },
                                },
                            },
                        },
                    },
                },
            },
        });

        // 「分母（リポジトリ全体の合計）」を取得
        const denominatorRes = await Axios.post(ES_API_URL, {
            size: 0,
            query: {
                bool: {
                    filter: [
                        { terms: { calc_date: lastDateOfYear } },
                        { term: { data_type: 'general.voies-ouverture.get-data' } },
                    ],
                },
            },
            aggs: {
                by_calc_date: {
                    terms: { field: 'calc_date', size: 1, order: { _key: 'desc' } },
                    aggs: {
                        nested_data: {
                            nested: { path: 'data' },
                            aggs: {
                                total_per_year: {
                                    terms: { field: 'data.publication_year', size: 1000 },
                                    aggs: {
                                        repository_sum: { sum: { field: 'data.repository' } },
                                        both_sum: { sum: { field: 'data.publisher;repository' } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const pickLatestBucket = (res) => res?.data?.aggregations?.by_calc_date?.buckets?.[0];

        // 日本の機関リポジトリ
        const jaOaMap = new Map();
        (pickLatestBucket(jaRes)?.nested_data?.total_per_year?.buckets ?? []).forEach((b) => {
            jaOaMap.set(Number(b.key), b.oa_sum?.value ?? 0);
        });

        // 分母（合計）
        const denomMap = new Map();
        (pickLatestBucket(denominatorRes)?.nested_data?.total_per_year?.buckets ?? []).forEach((b) => {
            const totalRepoOA = (b.repository_sum?.value ?? 0) + (b.both_sum?.value ?? 0);
            denomMap.set(Number(b.key), totalRepoOA);
        });

        // 日本の機関リポジトリ以外
        const notJaOaMap = new Map();
        const snapYear = parseInt(lastObservationSnap.substring(0, 4), 10);
        const years = Array.from(new Set([...jaOaMap.keys(), ...denomMap.keys()]))
            .filter((y) => y > 2012 && y < snapYear)
            .sort((a, b) => a - b);

        years.forEach((y) => {
            const total = denomMap.get(y) ?? 0;
            const ja = jaOaMap.get(y) ?? 0;
            notJaOaMap.set(y, Math.max(0, total - ja));
        });

        const buildPoints = ({ yearsList, absMap, dMap }) => yearsList.map((year) => {
            const abs = absMap.get(year) ?? 0;
            const tot = dMap.get(year) ?? 0;
            return {
                x: year,
                publicationDate: year,
                bsoDomain,
                y: tot > 0 ? (abs * 100) / tot : 0,
                y_abs: abs,
                y_tot: tot,
            };
        });

        const hal = buildPoints({ yearsList: years, absMap: jaOaMap, dMap: denomMap });
        const notHal = buildPoints({ yearsList: years, absMap: notJaOaMap, dMap: denomMap });

        const dataGraph2 = [
            {
                name: capitalize(
                    intl.formatMessage({
                        id: 'app.health-publi.repositories.dynamique-hal.notHal',
                    }),
                ),
                data: notHal,
                color: getCSSValue('--green-medium-150'),
            },
            {
                name: capitalize(
                    intl.formatMessage({
                        id: 'app.health-publi.repositories.dynamique-hal.hal',
                    }),
                ),
                data: hal,
                color: getCSSValue('--acces-ouvert'),
            },
        ];
        const publicationYears = years;
        const observationYear = lastObservationSnap ? lastObservationSnap.substring(0, 4) : '';
        return { publicationYears, dataGraph2, comments: { observationYear } };
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(false);
                const shaped = await getDataByObservationSnaps();
                if (!cancelled) setData(shaped);
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [beforeLastObservationSnap, lastObservationSnap, domain]);
    return { data, isLoading, isError };
}
export default useGetDataTest;
