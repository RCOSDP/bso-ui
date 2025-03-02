import Axios from 'axios';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { ES_STUDIES_API_URL, HEADERS } from '../../../../../config/config';
import getFetchOptions from '../../../../../utils/chartFetchOptions';
import { capitalize, getCSSValue } from '../../../../../utils/helpers';

function useGetData(studyType, sponsor = '*') {
  const intl = useIntl();
  const [allData, setData] = useState({});
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);

  async function getDataAxios() {
    const currentYear = parseInt(
      process.env.REACT_APP_LAST_OBSERVATION.substring(0, 4),
      10,
    );
    const yearMin = currentYear - 11;
    const yearMax = currentYear - 1;
    const queries = [];
    const querySponsors = getFetchOptions({
      key: 'sponsorsList',
      parameters: [studyType, yearMin, yearMax],
      objectType: ['clinicalTrials'],
    });
    queries.push(Axios.post(ES_STUDIES_API_URL, querySponsors, HEADERS));
    const queryDynamiqueOuverture = getFetchOptions({
      key: 'studiesDynamiqueOuverture',
      parameters: [studyType, yearMin, yearMax],
      objectType: ['clinicalTrials'],
    });
    queries.push(
      Axios.post(ES_STUDIES_API_URL, queryDynamiqueOuverture, HEADERS),
    );
    const queryDynamiqueOuvertureSponsor = getFetchOptions({
      key: 'studiesDynamiqueOuvertureSponsor',
      parameters: [studyType, sponsor, yearMin, yearMax],
      objectType: ['clinicalTrials'],
    });
    queries.push(
      Axios.post(ES_STUDIES_API_URL, queryDynamiqueOuvertureSponsor, HEADERS),
    );
    const queryDynamiqueSponsor = getFetchOptions({
      key: 'studiesDynamiqueSponsor',
      parameters: [studyType, yearMin, yearMax],
      objectType: ['clinicalTrials'],
    });
    queries.push(
      Axios.post(ES_STUDIES_API_URL, queryDynamiqueSponsor, HEADERS),
    );
    const res = await Axios.all(queries);
    const sponsors = res[0].data.aggregations.by_sponsor.buckets.map(
      (item) => ({
        value: item.key,
        label: item.key,
      }),
    );
    const data1 = res[1].data.aggregations;
    const data2 = res[2].data.aggregations;
    const series = [
      { name: intl.formatMessage({ id: 'app.sponsor-type' }), data: [] },
    ];
    const academic = data1.by_sponsor_type.buckets.find(
      (ele) => ele.key === 'academique',
    );
    const academicWith = academic?.by_has_result.buckets.find(
      (ele) => ele.key === 1,
    );
    const indus = data1.by_sponsor_type.buckets.find(
      (ele) => ele.key === 'industriel',
    );
    const indusWith = indus?.by_has_result.buckets.find((ele) => ele.key === 1);
    const spons = data2;
    const sponsWith = spons?.by_has_result.buckets.find((ele) => ele.key === 1);
    const sponsWithout = spons?.by_has_result.buckets.find(
      (ele) => ele.key === 0,
    );
    const categories = [
      capitalize(intl.formatMessage({ id: 'app.all-sponsor-types' })),
      capitalize(intl.formatMessage({ id: 'app.sponsor.industriel' })),
      capitalize(intl.formatMessage({ id: 'app.sponsor.academique' })),
    ];
    series[0].data.push({
      name: intl.formatMessage({ id: 'app.all-sponsor-types' }),
      yearMin,
      yearMax,
      color: getCSSValue('--blue-soft-100'),
      y_tot: academic?.doc_count + indus?.doc_count || 0,
      y_abs: academicWith?.doc_count + indusWith?.doc_count || 0,
      y:
        100
        * ((academicWith?.doc_count + indusWith?.doc_count)
          / (academic?.doc_count + indus?.doc_count)),
    });
    series[0].data.push({
      yearMin,
      yearMax,
      name: intl.formatMessage({ id: 'app.sponsor.academique' }),
      y_tot: academic?.doc_count || 0,
      y_abs: academicWith?.doc_count || 0,
      y: 100 * ((academicWith?.doc_count || 0) / academic?.doc_count),
      color: getCSSValue('--lead-sponsor-public'),
    });
    series[0].data.push({
      yearMin,
      yearMax,
      name: intl.formatMessage({ id: 'app.sponsor.industriel' }),
      y_tot: indus?.doc_count || 0,
      y_abs: indusWith?.doc_count || 0,
      y: 100 * ((indusWith?.doc_count || 0) / indus?.doc_count),
      color: getCSSValue('--lead-sponsor-privee'),
    });
    if (sponsor !== '*') {
      series[0].data.push({
        yearMin,
        yearMax,
        color: getCSSValue('--lead-sponsor-highlight'),
        name: sponsor,
        y_tot: (sponsWith?.doc_count || 0) + (sponsWithout?.doc_count || 0),
        y_abs: sponsWith?.doc_count || 0,
        y:
          100
          * ((sponsWith?.doc_count || 0)
            / ((sponsWith?.doc_count || 0) + (sponsWithout?.doc_count || 0))),
      });
      categories.push(sponsor);
    }
    const dataGraph1 = { categories, series };

    const tab = { data: [] };
    const categories2 = [];
    res[3].data.aggregations.by_sponsor.buckets.forEach((currentSponsor) => {
      if (currentSponsor.key !== 'N/A') {
        const bucket = currentSponsor.by_type.buckets[0];
        const obj = {
          name: currentSponsor.key,
          yearMin,
          yearMax,
          sponsor_type: bucket.key,
          color:
            bucket.key === 'academique'
              ? getCSSValue('--lead-sponsor-public')
              : getCSSValue('--lead-sponsor-privee'),
          y_tot: bucket.doc_count || 0,
          y_abs:
            bucket.by_has_result.buckets.find((el) => el.key === 1)
              ?.doc_count || 0,
          y:
            (100
              * bucket.by_has_result.buckets.find((el) => el.key === 1)
                ?.doc_count || 0) / bucket.doc_count,
        };
        tab.data.push(obj);
        categories2.push(currentSponsor.key);
      }
    });
    const series2 = [tab];
    const dataGraph2 = { categories2, series2 };
    return {
      dataGraph1,
      dataGraph2,
      sponsors,
    };
  }

  useEffect(() => {
    async function getData() {
      try {
        const dataGraph = await getDataAxios();
        setData(dataGraph);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyType, sponsor]);

  return { allData, isError, isLoading };
}
export default useGetData;
