/* eslint-disable react/no-this-in-sfc */
import { Col, Container, Row } from '@dataesr/react-dsfr';
import Highcharts from 'highcharts';
import HCExportingData from 'highcharts/modules/export-data';
import HCExporting from 'highcharts/modules/exporting';
import HighchartsReact from 'highcharts-react-official';
import JSZip from 'jszip';
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

// ZIP エントリの日付メタデータ用
const buildZipEntryDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000);
};

// Highchartsのポイントから行データを組み立て
const buildRowsForExportData = (chart, rateLabel) => {
  // グラフデータ取得
  const points = chart.series?.[0]?.points ?? [];
  return [
    // ヘッダを追加
    ['year', rateLabel, 'oa_count', 'total_count'],
    // データ出力
    ...points.map((p) => [
      String(p.name ?? p.category ?? '').replace(/<br\s*\/?>/g, ' - '),
      p.y ?? '',
      p?.y_abs ?? '',
      p?.y_tot ?? '',
    ]),
  ];
};

// Blobをブラウザに保存
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// HighchartsのSVGをPNG Blobに変換
const svgToPngBlob = (chart, { scale = 2 } = {}) => new Promise((resolve, reject) => {
  const svgString = chart.getSVG();
  const width = parseFloat(svgString.match(/width="([\d.]+)"/)?.[1]) || chart.chartWidth;
  const height = parseFloat(svgString.match(/height="([\d.]+)"/)?.[1]) || chart.chartHeight;
  const url = URL.createObjectURL(
    new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }),
  );
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(
      (pngBlob) => (pngBlob ? resolve(pngBlob) : reject(new Error('PNG変換に失敗しました'))),
      'image/png',
    );
  };
  img.onerror = (err) => {
    URL.revokeObjectURL(url);
    reject(err);
  };
  img.src = url;
});

const Chart = ({ domain, hasComments, hasFooter, id }) => {
  const [chartComments, setChartComments] = useState('');
  const intl = useIntl();
  const { observationSnaps } = useGlobals();
  const { data, isError, isLoading } = useGetData(observationSnaps, domain);
  const idWithDomain = withDomain(id, domain);
  const chartRefs = useRef([]);
  let graphs = [];
  if (data?.dataHist) {
    data.dataHist.forEach((oneGraph) => {
      const optionsGraph = chartOptions[id].getOptions(
        idWithDomain,
        intl,
        oneGraph,
      );
      graphs.push(optionsGraph);
    });
  }
  const serieLength = graphs[0]?.series[0].data.length - 1;
  // classement par ordre décroissant (en taux d'oa) des disciplines
  graphs = graphs.sort(
    (a, b) => b.series[0].data[serieLength].y - a.series[0].data[serieLength].y,
  );

  useEffect(() => {
    setChartComments(customComments(data, idWithDomain, intl));
  }, [data, idWithDomain, intl]);

  // エクスポートZIPファイル名
  const exportBaseName = intl.formatMessage({
    id: `${idWithDomain}.export.basename`,
    defaultMessage: '前年の出版物の分野別のオープンアクセス率',
  });
  const csvRateLabel = intl.formatMessage({
    id: `${idWithDomain}.export.column.rate`,
    defaultMessage: 'オープンアクセス',
  });

  // 全グラフのCSVを1つのZIPにまとめる
  const exportChartCsv = async () => {
    const zip = new JSZip();
    const date = buildZipEntryDate();
    chartRefs.current.filter((r) => r?.chart).forEach((instance) => {
      const { chart } = instance;
      const rows = buildRowsForExportData(chart, csvRateLabel);
      const name = String(chart.series?.[0]?.name || '');
      zip.file(`${exportBaseName}_${name}.csv`, `\ufeff${rows.map((r) => r.join(',')).join('\r\n')}`, {
        date,
      });
      if (IS_TEST) {
        console.log(`${name || 'unknown'}_value:`, rows); // eslint-disable-line no-console
      }
    });
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${exportBaseName}_csv.zip`);
  };

  // 全グラフのPNGを1つのZIPにまとめる
  const exportChartPng = async () => {
    const zip = new JSZip();
    const date = buildZipEntryDate();
    await Promise.all(
      chartRefs.current.filter((r) => r?.chart).map(async (instance) => {
        const { chart } = instance;
        const name = String(chart.series?.[0]?.name || '');
        zip.file(`${exportBaseName}_${name}.png`, await svgToPngBlob(chart), { date });
      }),
    );
    downloadBlob(
      await zip.generateAsync({ type: 'blob', compression: 'STORE' }),
      `${exportBaseName}_png.zip`,
    );
  };

  return (
    <ChartWrapper
      domain={domain}
      enableExport
      hasComments={false}
      hasFooter={hasFooter}
      id={id}
      isError={isError}
      isLoading={isLoading || !data || data.length <= 0}
      onDisciplinesDownloadCSV={exportChartCsv}
      onDisciplinesDownloadPNG={exportChartPng}
    >
      <Container>
        <Row>
          {graphs.map((graphOptions, i) => (
            <Col n='3' key={graphOptions.series[0].name}>
              <HighchartsReact
                ref={(el) => {
                  chartRefs.current[i] = el;
                }}
                highcharts={Highcharts}
                id={`${idWithDomain}-${i}`}
                options={graphOptions}
              />
            </Col>
          ))}
        </Row>
      </Container>
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
  id: 'publi.disciplines.dynamique-ouverture.chart-taux-ouverture',
};

Chart.propTypes = {
  domain: PropTypes.oneOf(domains),
  hasComments: PropTypes.bool,
  hasFooter: PropTypes.bool,
  id: PropTypes.oneOf(graphIds),
};

export default Chart;
