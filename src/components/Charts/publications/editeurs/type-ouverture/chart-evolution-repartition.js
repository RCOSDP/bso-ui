import Highcharts from 'highcharts';
import HCExportingData from 'highcharts/modules/export-data';
import HCExporting from 'highcharts/modules/exporting';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { IS_TEST } from '../../../../../config/config';
import customComments from '../../../../../utils/chartComments';
import { chartOptions } from '../../../../../utils/chartOptions';
import { domains, graphIds } from '../../../../../utils/constants';
import { withDomain } from '../../../../../utils/helpers';
import useGlobals from '../../../../../utils/Hooks/useGetGlobals';
import ChartWrapper from '../../../../ChartWrapper';
import GraphComments from '../../../graph-comments';
// import useGetData from './get-data';
import useGetData from './get-data-josm';

HCExporting(Highcharts);
HCExportingData(Highcharts);

const Chart = ({ id, domain, hasComments, hasFooter }) => {
  const chartRef = useRef();
  const intl = useIntl();
  const [chartComments, setChartComments] = useState('');
  const { lastObservationSnap } = useGlobals();
  const { allData, isError, isLoading } = useGetData(
    lastObservationSnap,
    domain,
  );
  const { categories, dataGraph } = allData;
  const idWithDomain = withDomain(id, domain);
  useEffect(() => {
    setChartComments(customComments(allData, idWithDomain, intl));
  }, [allData, idWithDomain, intl]);
  const optionsGraph = chartOptions[id].getOptions(
    idWithDomain,
    intl,
    categories,
    dataGraph,
  );

  // ハンバーガーメニュー非表示
  optionsGraph.exporting = { ...(optionsGraph.exporting || {}), enabled: false };

  // CSV出力直前フック
  optionsGraph.chart.events.exportData = (e) => {
    const rows = e?.dataRows;
    if (!rows || rows.length <= 1) return;

    const chart = e.target;

    // 可視状態の指標についてグラフデータ取得
    const seriesList = (chart.series || []).filter((s) => s.visible !== false);

    // ヘッダを追加
    const header = rows[0];
    seriesList.forEach((s) => header.push(`${s.name}_oa_count`));
    header.push('total_count');

    // データ出力
    rows.slice(1).forEach((row, idx) => {
      const r = idx + 1; // rows は [0]=ヘッダ なのでデータ行は 1 始まり
      // 分子（各 series の y_abs）
      seriesList.forEach((s) => {
        const p = s?.points?.[r - 1];
        row.push(p?.y_abs ?? '');
      });
      // 分母（その行で 1 つ）：先頭 series の y_tot
      const p0 = seriesList?.[0]?.points?.[r - 1];
      row.push(p0?.y_tot ?? '');
    });
    if (IS_TEST) {
      console.log('CSV_value:', rows); // eslint-disable-line no-console
    }
  };

  return (
    <ChartWrapper
      chartRef={chartRef}
      domain={domain}
      hasComments={false}
      hasFooter={hasFooter}
      id={id}
      isError={isError}
      isLoading={isLoading || !allData}
    >
      <HighchartsReact
        highcharts={Highcharts}
        options={optionsGraph}
        ref={chartRef}
        id={idWithDomain}
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
  id: 'publi.publishers.type-ouverture.chart-evolution-repartition',
};
Chart.propTypes = {
  domain: PropTypes.oneOf(domains),
  hasComments: PropTypes.bool,
  hasFooter: PropTypes.bool,
  id: PropTypes.oneOf(graphIds),
};

export default Chart;
