/* eslint-disable react/no-this-in-sfc */
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

const Chart = ({ hasFooter, hasComments, id, domain }) => {
  const chartRef = useRef();
  const intl = useIntl();

  const { beforeLastObservationSnap, lastObservationSnap } = useGlobals();
  const [chartComments, setChartComments] = useState('');
  const { data, isError, isLoading } = useGetData(
    beforeLastObservationSnap,
    lastObservationSnap,
    domain,
  );
  const { publicationYears, dataGraph2 } = data;
  const idWithDomain = withDomain(id, domain);
  const optionsGraph = chartOptions[id].getOptions(
    idWithDomain,
    intl,
    publicationYears,
    dataGraph2,
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
      const r = idx + 1;
      seriesList.forEach((s) => {
        const p = s?.points?.[r - 1];
        row.push(p?.y_abs ?? '');
      });
      const p0 = seriesList?.[0]?.points?.[r - 1];
      row.push(p0?.y_tot ?? '');
    });
    if (IS_TEST) {
      console.log('CSV_value:', rows); // eslint-disable-line no-console
    }
  };

  useEffect(() => {
    setChartComments(customComments(data, idWithDomain, intl));
  }, [data, idWithDomain, intl]);

  return (
    <ChartWrapper
      chartRef={chartRef}
      domain={domain}
      hasComments={false}
      isLoading={isLoading || !dataGraph2}
      isError={isError}
      id={id}
      hasFooter={hasFooter}
    >
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
  id: 'publi.repositories.dynamique-hal.chart-couverture-hal',
};
Chart.propTypes = {
  domain: PropTypes.oneOf(domains),
  hasComments: PropTypes.bool,
  hasFooter: PropTypes.bool,
  id: PropTypes.oneOf(graphIds),
};

export default Chart;
