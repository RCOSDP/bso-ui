import Highcharts from 'highcharts';
import HCExportingData from 'highcharts/modules/export-data';
import HCExporting from 'highcharts/modules/exporting';
import treemapModule from 'highcharts/modules/treemap';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { IS_TEST } from '../../../../../config/config';
import customComments from '../../../../../utils/chartComments';
import { chartOptions } from '../../../../../utils/chartOptions';
import { domains, graphIds } from '../../../../../utils/constants';
import { getObservationLabel, withDomain } from '../../../../../utils/helpers';
import useGlobals from '../../../../../utils/Hooks/useGetGlobals';
import ChartWrapper from '../../../../ChartWrapper';
import GraphComments from '../../../graph-comments';
// import useGetData from './get-data';
import useGetData from './get-data-josm';

treemapModule(Highcharts);
HCExporting(Highcharts);
HCExportingData(Highcharts);

const Chart = ({ domain, hasComments, hasFooter, id }) => {
  const chartRef = useRef();
  const intl = useIntl();
  const [chartComments, setChartComments] = useState('');
  const { beforeLastObservationSnap, lastObservationSnap } = useGlobals();
  const { allData, isError, isLoading } = useGetData(
    beforeLastObservationSnap,
    lastObservationSnap,
    domain,
  );
  const { dataGraph3 } = allData;
  const dataTitle = {
    publicationYear: getObservationLabel(beforeLastObservationSnap, intl),
    observationYear: getObservationLabel(lastObservationSnap, intl),
  };
  const idWithDomain = withDomain(id, domain);
  const optionsGraph = chartOptions[id].getOptions(
    idWithDomain,
    intl,
    dataGraph3,
    dataTitle,
  );

  // ハンバーガーメニュー非表示
  optionsGraph.exporting = { ...(optionsGraph.exporting || {}), enabled: false };
  // CSV出力直前フック
  optionsGraph.chart.events.exportData = (e) => {
    const rows = e?.dataRows;
    if (!rows || rows.length === 0) return;
    const header = rows[0];
    // ヘッダー作成
    header.splice(1, 0, 'proportion');
    header[2] = 'oa_count';
    header.push('total_count');

    const points = e.target?.series?.[0]?.points ?? [];
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      const p = points[r - 1];
      const oa = p?.value ?? row?.[1] ?? '';
      const perc = p?.percentage ?? '';
      const tot = (oa * 100) / perc;
      row.splice(1, 0, perc);
      row[2] = oa;
      row.push(tot);
    }
    if (IS_TEST) {
      console.log('CSV_value:', rows); // eslint-disable-line no-console
    }
  };

  useEffect(() => {
    setChartComments(customComments(allData, idWithDomain, intl));
  }, [allData, idWithDomain, intl]);

  return (
    <ChartWrapper
      chartRef={chartRef}
      dataTitle={dataTitle}
      domain={domain}
      hasComments={false}
      hasFooter={hasFooter}
      id={id}
      isError={isError}
      isLoading={isLoading || !dataGraph3}
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
  id: 'publi.general.voies-ouverture.chart-repartition-publications',
};
Chart.propTypes = {
  domain: PropTypes.oneOf(domains),
  hasComments: PropTypes.bool,
  hasFooter: PropTypes.bool,
  id: PropTypes.oneOf(graphIds),
};

export default Chart;
