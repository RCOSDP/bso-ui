/* eslint-disable react/no-this-in-sfc */
// import Axios from 'axios';
import Highcharts from 'highcharts';
import HCExportingData from 'highcharts/modules/export-data';
import HCExporting from 'highcharts/modules/exporting';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { IS_TEST } from '../../../../../config/config';
// import { ES_API_URL, HEADERS } from '../../../../../config/config';
// import { PUBLISHER_LIST } from '../../../../../config/publisher';
import { PUBLISHER_LIST } from '../../../../../config/publicationDataLists';
import customComments from '../../../../../utils/chartComments';
// import getFetchOptions from '../../../../../utils/chartFetchOptions';
import { chartOptions } from '../../../../../utils/chartOptions';
import { domains, graphIds } from '../../../../../utils/constants';
import { capitalize, withDomain } from '../../../../../utils/helpers';
import useGlobals from '../../../../../utils/Hooks/useGetGlobals';
import ChartWrapper from '../../../../ChartWrapper';
import SearchableSelect from '../../../../SearchableSelect';
import GraphComments from '../../../graph-comments';
// import useGetData from './get-data';
import useGetData from './get-data-josm';

HCExporting(Highcharts);
HCExportingData(Highcharts);

const Chart = ({ domain, hasComments, hasFooter, id }) => {
  const chartRef = useRef();
  const intl = useIntl();
  const [chartComments, setChartComments] = useState('');
  const [options, setOptions] = useState([]);
  const [publisher, setPublisher] = useState('*');
  // const { lastObservationSnap, observationSnaps } = useGlobals();
  const { observationSnaps } = useGlobals();
  const { data, isError, isLoading } = useGetData(
    observationSnaps,
    publisher,
    domain,
  );
  const { categories, dataGraph2 } = data;
  const idWithDomain = withDomain(id, domain);
  const publisherTitle = publisher !== '*' ? ` ${publisher}` : ` ${capitalize(intl.formatMessage({ id: 'app.all-publishers' }))}`;
  const dataTitle = { publisherTitle };
  const optionsGraph = chartOptions[id].getOptions(
    idWithDomain,
    intl,
    dataGraph2,
    dataTitle,
    categories,
  );

  // ハンバーガーメニュー非表示
  optionsGraph.exporting = { ...(optionsGraph.exporting || {}), enabled: false };

  // CSV出力直前フック
  optionsGraph.chart.events.exportData = (e) => {
    const rows = e?.dataRows;
    if (!rows || rows.length <= 1) return;

    const chart = e.target;

    // 正規化
    const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      while (row.length < maxCols) row.push('');
    }

    // 可視状態の指標についてグラフデータ取得
    const seriesList = (chart.series || []).filter((s) => s.visible !== false);

    // ヘッダを追加
    const header = rows[0];
    seriesList.forEach((s) => header.push(`${s.name}_oa_count`));
    seriesList.forEach((s) => header.push(`${s.name}_total_count`));

    // データ出力
    rows.slice(1).forEach((row, idx) => {
      const r = idx + 1; // rows[0] はヘッダ
      // 分子（各 series の y_abs）
      seriesList.forEach((s) => {
        const p = s?.points?.[r - 1];
        row.push(p?.y_abs ?? '');
      });
      // 分母（各 series の y_tot）
      seriesList.forEach((s) => {
        const p = s?.points?.[r - 1];
        row.push(p?.y_tot ?? '');
      });
    });
    if (IS_TEST) {
      console.log('CSV_value:', rows); // eslint-disable-line no-console
    }
  };

  useEffect(() => {
    setChartComments(customComments(data, idWithDomain, intl));
  }, [data, idWithDomain, intl]);

  useEffect(() => {
    const opts = PUBLISHER_LIST.map((item) => ({ label: item, value: item }));
    opts.unshift({
      label: capitalize(intl.formatMessage({ id: 'app.all-publishers' })),
      value: '*',
    });
    setOptions(opts);
  }, [intl]);

  return (
    <ChartWrapper
      chartRef={chartRef}
      dataTitle={dataTitle}
      domain={domain}
      hasComments={false}
      hasFooter={hasFooter}
      id={id}
      isError={isError}
      isLoading={isLoading || !dataGraph2}
    >
      <SearchableSelect
        label={intl.formatMessage({ id: 'app.publishers-filter-label' })}
        onChange={(e) => (e.length > 0 ? setPublisher(e) : null)}
        options={options || []}
        selected={publisher}
      />
      <HighchartsReact
        highcharts={Highcharts}
        id={idWithDomain}
        options={optionsGraph}
        ref={chartRef}
      />
      {hasComments && chartComments && (
        <GraphComments comments={chartComments} hasFooter={hasFooter} />
      )}
    </ChartWrapper>
  );
};

Chart.defaultProps = {
  domain: '',
  hasComments: true,
  hasFooter: true,
  id: 'publi.publishers.dynamique-ouverture.chart-evolution-proportion',
};
Chart.propTypes = {
  domain: PropTypes.oneOf(domains),
  hasComments: PropTypes.bool,
  hasFooter: PropTypes.bool,
  id: PropTypes.oneOf(graphIds),
};

export default Chart;
