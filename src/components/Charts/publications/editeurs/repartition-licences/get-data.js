import Axios from 'axios';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { ES_API_URL, HEADERS } from '../../../../../config/config';
import getFetchOptions from '../../../../../utils/chartFetchOptions';
import {
  capitalize,
  getCSSValue,
  getPublicationYearFromObservationSnap,
} from '../../../../../utils/helpers';

function useGetData(observationSnaps, isDetailed, needle = '*', domain = '') {
  const [data, setData] = useState({});
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);
  const intl = useIntl();
  const bsoDomain = intl.formatMessage({ id: `app.bsoDomain.${domain}` });

  async function getDataByObservationSnaps(observationYears) {
    if (!observationYears || observationYears.length === 0) {
      return {};
    }
    const queries = [];
    const query = getFetchOptions({
      key: 'publishersLicence',
      domain,
      parameters: [observationYears[0], needle],
      objectType: ['publications'],
    });
    const publicationDate = getPublicationYearFromObservationSnap(
      observationYears[0],
    );
    queries.push(Axios.post(ES_API_URL, query, HEADERS));
    const res = await Axios.all(queries);
    const results = res[0].data.aggregations.by_is_oa.buckets?.[0]?.by_licence?.buckets ?? [];
    const nbTotal = res[0].data.aggregations.by_is_oa.buckets?.[0]?.doc_count ?? 0;
    const openLicenceNumber = results
      .filter((item) => item.key !== 'no license')
      .reduce((a, b) => a + b.doc_count, 0);
    const ccbyLicenceNumber = results.find((item) => item.key === 'cc-by')?.doc_count ?? 0;
    const openLicenceRate = (100 * openLicenceNumber) / nbTotal;
    const ccbyLicenceRate = (100 * ccbyLicenceNumber) / nbTotal;
    const dataGraphTreemap = [];
    if (isDetailed) {
      results.forEach((el) => {
        dataGraphTreemap.push({
          name: capitalize(
            intl.formatMessage({
              id: `app.licenses.${el.key}`,
            }),
          ),
          publisher:
            needle === '*'
              ? intl.formatMessage({ id: 'app.all-publishers' })
              : needle,
          value: el.doc_count,
          y_tot: nbTotal,
          bsoDomain,
          y_perc: (100 * el.doc_count) / nbTotal,
          publicationDate,
          color:
            el.key === 'no license'
              ? getCSSValue('--g-400')
              : getCSSValue('--acces-ouvert'),
        });
      });
    } else {
      dataGraphTreemap.push({
        name: capitalize(
          intl.formatMessage({
            id: 'app.licenses.open-license',
          }),
        ),
        publisher:
          needle === '*'
            ? intl.formatMessage({ id: 'app.all-publishers' })
            : needle,
        color: getCSSValue('--acces-ouvert'),
        value: openLicenceNumber,
        y_tot: nbTotal,
        bsoDomain,
        y_perc: openLicenceRate,
        publicationDate,
      });
      const noLicenceElem = results.find((el) => el.key === 'no license');
      const nbNoLicence = noLicenceElem ? noLicenceElem.doc_count : 0;
      dataGraphTreemap.push({
        name: capitalize(
          intl.formatMessage({
            id: 'app.licenses.no license',
          }),
        ),
        publisher:
          needle === '*'
            ? intl.formatMessage({ id: 'app.all-publishers' })
            : needle,
        color: getCSSValue('--g-400'),
        value: nbNoLicence,
        y_tot: nbTotal,
        bsoDomain,
        y_perc: (100 * nbNoLicence) / nbTotal,
        publicationDate,
      });
    }

    const openLicence = [];
    const noLicence = [];
    const categories = [];
    res[0].data.aggregations.by_publisher.buckets.forEach((elem) => {
      categories.push(elem.key);
      const noLicenceElem = elem.by_licence.buckets.find(
        (el) => el.key === 'no license',
      );
      noLicence.push({
        publisher: elem.key,
        bsoDomain,
        y_tot: elem.doc_count,
        y_abs: noLicenceElem ? noLicenceElem.doc_count : 0,
        y:
          (100 * (noLicenceElem ? noLicenceElem.doc_count : 0))
          / elem.doc_count,
        publicationDate,
      });
      openLicence.push({
        publisher: elem.key,
        bsoDomain,
        y_tot: elem.doc_count,
        y_abs: elem.by_licence.buckets
          .filter((el) => el.key !== 'no license')
          .reduce((a, b) => a + b.doc_count, 0),
        y:
          (100
            * elem.by_licence.buckets
              .filter((el) => el.key !== 'no license')
              .reduce((a, b) => a + b.doc_count, 0))
          / elem.doc_count,
        publicationDate,
      });
    });
    const dataGraphBar = [
      {
        name: capitalize(intl.formatMessage({ id: 'app.licenses.no license' })),
        data: noLicence,
        color: getCSSValue('--g-400'),
      },
      {
        name: capitalize(
          intl.formatMessage({ id: 'app.licenses.open-license' }),
        ),
        data: openLicence,
        color: getCSSValue('--acces-ouvert'),
      },
    ];

    const publisher = 'Elsevier';
    const openLicenseLabel = capitalize(
      intl.formatMessage({ id: 'app.licenses.open-license' }),
    );
    const comments = {
      openLicenceRate: openLicenceRate.toFixed(0),
      ccbyLicenceRate: ccbyLicenceRate.toFixed(0),
      publicationDate,
      publisher,
      elsevierOpenLicenceRate: dataGraphBar
        ?.find((item) => item.name === openLicenseLabel)
        ?.data.find((item) => item.publisher === publisher)
        ?.y.toFixed(0),
    };

    return {
      categories,
      comments,
      dataGraphBar,
      dataGraphTreemap,
    };
  }

  useEffect(() => {
    async function getData() {
      try {
        const dataGraph = await getDataByObservationSnaps(observationSnaps);
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
  }, [observationSnaps, isDetailed, needle]);

  return { data, isError, isLoading };
}
export default useGetData;
