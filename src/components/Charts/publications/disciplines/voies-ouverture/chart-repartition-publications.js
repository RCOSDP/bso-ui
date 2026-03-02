import { Radio, RadioGroup } from '@dataesr/react-dsfr';
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
import {
  capitalize,
  cleanNumber,
  getObservationLabel,
  withDomain,
} from '../../../../../utils/helpers';
import useGlobals from '../../../../../utils/Hooks/useGetGlobals';
import ChartWrapper from '../../../../ChartWrapper';
import GraphComments from '../../../graph-comments';
// import useGetData from './get-data';
import useGetData from './get-data-josm';

HCExporting(Highcharts);
HCExportingData(Highcharts);

const Chart = ({ domain, hasComments, hasFooter, id }) => {
  const chartRef = useRef();
  const intl = useIntl();
  const { beforeLastObservationSnap, lastObservationSnap } = useGlobals();
  const [chartComments, setChartComments] = useState('');
  const [dataTitle, setDataTitle] = useState({});
  const [optionsGraph, setOptionsGraph] = useState(null);
  const [sort, setSort] = useState('sort-staff');
  const idWithDomain = withDomain(id, domain);
  const { allData, isError, isLoading } = useGetData(
    beforeLastObservationSnap,
    lastObservationSnap,
    domain,
  );
  const { categories, dataGraph } = allData;

  // 複数個所でフックを用いるため関数化
  function patchExportDataForFields(options) {
    // 行側キー抽出: "<br>" 以降の装飾を落として正規化
    const normalizeRowKey = (value) => {
      const str = String(value ?? '');
      const i = str.indexOf('<'); // "<br>" や他HTML装飾の先頭で分割
      const head = i >= 0 ? str.slice(0, i) : str;
      return head.trim().replace(/\s+/g, ' ').toLowerCase();
    };

    // 2) point側キー抽出: name -> category -> xAxis.categories[x] の順で取得し正規化
    const makePointKeyGetter = (chart) => {
      const xCats = chart?.xAxis?.[0]?.categories ?? null;
      return (p) => {
        if (!p) return '';
        const name = p.name != null ? String(p.name) : null;
        const cat = p.category != null ? String(p.category) : null;
        const xcat = Number.isFinite(p.x) && xCats?.[p.x] != null ? String(xCats[p.x]) : null;
        const raw = name ?? cat ?? xcat ?? '';
        return normalizeRowKey(raw);
      };
    };

    const handler = (e) => {
      const rows = e?.dataRows;
      if (!rows || rows.length <= 1) return;

      const chart = e?.target;
      const getPointKey = makePointKeyGetter(chart);

      // 可視状態の指標についてグラフデータ取得
      const seriesList = (chart?.series || []).filter((s) => s.visible !== false);

      // ヘッダを追加
      const header = rows[0];
      seriesList.forEach((s) => header.push(`${s.name}_oa_count`));
      header.push('total_count'); // ラベルは '総数' 等に変更可

      // --- series ごとに「キー -> point」Map を構築 ---
      const maps = seriesList.map((s) => {
        const m = new Map();
        (s?.points ?? []).forEach((p) => {
          const k = getPointKey(p);
          if (k) m.set(k, p);
        });
        return m;
      });
      const firstSeriesMap = maps[0] ?? new Map(); // 分母は先頭seriesから取得

      // --- 各行をキーで照合して値を埋める ---
      for (let r = 1; r < rows.length; r += 1) {
        const row = rows[r];
        const rowKey = normalizeRowKey(row?.[0]); // CSV 1列目（カテゴリ）

        // 各 series の分子（y_abs）
        maps.forEach((m) => {
          const p = m.get(rowKey);
          row.push(p?.y_abs ?? '');
        });

        // 分母（先頭 series の y_tot）
        const p0 = firstSeriesMap.get(rowKey);
        row.push(p0?.y_tot ?? '');
      }
      if (IS_TEST) {
        console.log('CSV_value:', rows); // eslint-disable-line no-console
      }
    };

    // パッチ済みの option オブジェクトを返却
    return {
      ...options,
      exporting: { ...(options?.exporting ?? {}), enabled: false }, // // ハンバーガーメニュー非表示
      chart: {
        ...(options?.chart ?? {}),
        events: {
          ...((options?.chart && options.chart.events) ?? {}),
          exportData: handler,
        },
      },
    };
  }

  useEffect(() => {
    setDataTitle({
      publicationYear: getObservationLabel(beforeLastObservationSnap, intl),
    });
  }, [beforeLastObservationSnap, intl]);

  useEffect(() => {
    let sortKey;
    if (sort === 'sort-staff') {
      categories?.sort((a, b) => b.staff - a.staff);
      sortKey = 'y_tot';
    } else {
      categories?.sort((a, b) => b.percent - a.percent);
      sortKey = 'oaRate';
    }
    const categoriesLabel = categories?.map((item) => capitalize(intl.formatMessage({ id: `app.discipline.${item.key}` }))
      .concat('<br>(')
      .concat(intl.formatMessage({ id: 'app.effectif' }))
      .concat(' = ')
      .concat(cleanNumber(item.staff))
      .concat(')')) || [];
    const base = chartOptions[id].getOptions(
      idWithDomain,
      intl,
      categoriesLabel,
      dataGraph,
      dataTitle,
      sortKey,
    );
    const patched = patchExportDataForFields(base);
    setOptionsGraph(patched);
    setChartComments(customComments(allData, idWithDomain, intl));
  }, [allData, categories, dataGraph, dataTitle, id, idWithDomain, intl, sort]);

  return (
    <ChartWrapper
      chartRef={chartRef}
      dataTitle={dataTitle}
      domain={domain}
      hasComments={false}
      hasFooter={hasFooter}
      id={id}
      isError={isError}
      isLoading={isLoading || !allData || !categories}
    >
      <RadioGroup
        className='d-inline-block'
        isInline
        legend={intl.formatMessage({ id: 'app.publi.sort' })}
        onChange={(newValue) => {
          const base = chartOptions[id].getOptions(
            idWithDomain,
            intl,
            [],
            [],
            dataTitle,
            'y_tot',
          );
          const patched = patchExportDataForFields(base);
          setOptionsGraph(patched);
          setSort(newValue);
        }}
        value={sort}
      >
        <Radio
          label={intl.formatMessage({ id: 'app.publi.sort-staff' })}
          value='sort-staff'
        />
        <Radio
          label={intl.formatMessage({ id: 'app.publi.sort-open-access' })}
          value='sort-open-rate'
        />
      </RadioGroup>
      <HighchartsReact
        highcharts={Highcharts}
        id={id}
        options={optionsGraph}
        ref={chartRef}
        style={{ height: '100%' }}
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
  id: 'publi.disciplines.voies-ouverture.chart-repartition-publications',
};
Chart.propTypes = {
  domain: PropTypes.oneOf(domains),
  hasComments: PropTypes.bool,
  hasFooter: PropTypes.bool,
  id: PropTypes.oneOf(graphIds),
};

export default Chart;
