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

        function buildRepoAggQuery({ calcDates, repoMode }) {
            // repoMode: 'not_ja' | 'ja'
            const baseBool = {
                filter: [
                    { terms: { calc_date: lastDateOfYear } },
                    { term: { data_type: 'archives.dynamique-ouverture.get-data' } },
                ],
            };

            if (repoMode === 'not_ja') {
                baseBool.must_not = [{ term: { repository: 'ja-repository' } }];
            } else if (repoMode === 'ja') {
                baseBool.filter.push({ term: { repository: 'ja-repository' } });
            }

            return {
                size: 0,
                query: { bool: baseBool },
                aggs: {
                    by_calc_date: {
                        terms: { field: 'calc_date', size: 1000, order: { _key: 'desc' } },
                        aggs: {
                            nested_data: {
                                nested: { path: 'data' },
                                aggs: {
                                    total_per_year: {
                                        terms: { field: 'data.publication_year', size: 1000 },
                                        aggs: {
                                            total_sum: { sum: { field: 'data.total' } },
                                            oa_sum: { sum: { field: 'data.oa' } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            };
        }
        const notJaRes = await Axios.post(
            ES_API_URL,
            buildRepoAggQuery({ lastDateOfYear, repoMode: 'not_ja' }),
        );

        const jaRes = await Axios.post(
            ES_API_URL,
            buildRepoAggQuery({ lastDateOfYear, repoMode: 'ja' }),
        );

        // データ整形
        const pickLatestBucket = (res) => res?.data?.aggregations?.by_calc_date?.buckets?.[0];

        const toYearOaMap = (bucket) => {
            const m = new Map();
            const ys = bucket?.nested_data?.total_per_year?.buckets ?? [];
            ys.forEach((b) => m.set(Number(b.key), b.oa_sum?.value ?? 0));
            return m;
        };

        const buildPoints = ({ years, absMap, denomMap }) => years.map((year) => {
            const abs = absMap.get(year) ?? 0;
            const tot = denomMap.get(year) ?? 0;
            return {
                x: year,
                publicationDate: year,
                bsoDomain,
                y: tot > 0 ? (abs * 100) / tot : 0,
                y_abs: abs,
                y_tot: tot,
            };
        });

        // --- jaRes/notJaRes から作る ---
        const jaBucket = pickLatestBucket(jaRes);
        const notJaBucket = pickLatestBucket(notJaRes);

        const jaOaMap = toYearOaMap(jaBucket);
        const notJaOaMap = toYearOaMap(notJaBucket);

        // 年の全集合を作る
        const snapYear = parseInt(lastObservationSnap.substring(0, 4), 10);

        const years = Array.from(new Set([...jaOaMap.keys(), ...notJaOaMap.keys()]))
            .filter((y) => y > 2012 && y < snapYear)
            .sort((a, b) => a - b);

        // 分母（全OA）Map を作る：denom(year) = jaOA + notJaOA
        const denomMap = new Map(
            years.map((y) => [y, (jaOaMap.get(y) ?? 0) + (notJaOaMap.get(y) ?? 0)]),
        );

        // hal / notHal の data 配列
        const hal = buildPoints({ years, absMap: jaOaMap, denomMap });
        const notHal = buildPoints({ years, absMap: notJaOaMap, denomMap });

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
