import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import { domains } from '../../utils/constants';
import { getObservationLabel } from '../../utils/helpers';
import useGlobals from '../../utils/Hooks/useGetGlobals';
import useGetData from '../Charts/publications/general/dynamique-ouverture/get-data-josm';
import Icon from '../Icon';
import InfoCard from '../InfoCard';

export default function ProgressionCard({ domain }) {
  const intl = useIntl();
  const { beforeLastObservationSnap, lastObservationSnap, observationSnaps } = useGlobals();
  const [previousObservationSnap, setPreviousObservationSnap] = useState('');
  const [progression, setProgression] = useState({});
  const { data } = useGetData(observationSnaps, domain);

  useEffect(() => {
    setPreviousObservationSnap(
      observationSnaps?.length > 1
        ? observationSnaps[observationSnaps.length - 1]
        : beforeLastObservationSnap,
    );
  }, [beforeLastObservationSnap, observationSnaps]);

  useEffect(() => {
    const seriesData = data?.dataGraph1?.series?.[0]?.data;
    if (
      !seriesData?.length
      || !lastObservationSnap
      || !previousObservationSnap
    ) {
      return;
    }
    const lastLabel = getObservationLabel(lastObservationSnap, intl);
    const previousLabel = getObservationLabel(previousObservationSnap, intl);
    const lastOaRate = seriesData.find(
      (item) => String(item.name) === String(lastLabel),
    )?.y;
    const previousOaRate = seriesData.find(
      (item) => String(item.name) === String(previousLabel),
    )?.y;
    if (lastOaRate != null && previousOaRate != null) {
      setProgression({
        [lastObservationSnap]: lastOaRate,
        [previousObservationSnap]: previousOaRate,
      });
    }
  }, [data, intl, lastObservationSnap, previousObservationSnap]);

  const progressionPoints = () => {
    let progPoints = '';
    if (lastObservationSnap && previousObservationSnap) {
      const rhesus = progression[lastObservationSnap] >= progression[previousObservationSnap]
        ? '+'
        : '';
      const lastOaRate = progression?.[lastObservationSnap];
      const previousOaRate = progression?.[previousObservationSnap];
      if (previousOaRate && lastOaRate) {
        const evolution = (
          lastOaRate.toFixed(1) - previousOaRate.toFixed(1)
        ).toFixed(1);
        progPoints = `${rhesus}${evolution}`;
      }
    }
    return progPoints;
  };

  return (
    <InfoCard
      icon={(
        <Icon
          name='icon-bsso-33'
          color1='blue-dark-125'
          color2='orange-soft-50'
        />
      )}
      data1={progressionPoints()}
      data2={
        progressionPoints() > 1
          ? ` ${intl.formatMessage({ id: 'app.commons.points' })}`
          : ` ${intl.formatMessage({ id: 'app.commons.point' })}`
      }
      title={(
        <FormattedMessage
          values={{
            startYear: getObservationLabel(previousObservationSnap, intl),
            endYear: getObservationLabel(lastObservationSnap, intl),
            div: (chunks) => <div>{chunks}</div>,
          }}
          id={
            domain === ''
              ? 'app.national-publi.progression'
              : 'app.health-publi.progression'
          }
          defaultMessage='Progression'
        />
      )}
    />
  );
}

ProgressionCard.defaultProps = {
  domain: '',
};

ProgressionCard.propTypes = {
  domain: PropTypes.oneOf(domains),
};
