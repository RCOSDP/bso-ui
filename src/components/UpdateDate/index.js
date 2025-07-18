import React from 'react';
import { FormattedMessage } from 'react-intl';

import {
  getFormattedDate,
} from '../../utils/helpers';
import useGlobals from '../../utils/Hooks/useGetGlobals';
import useLang from '../../utils/Hooks/useLang';

export default function UpdateDate() {
  const { lastObservationSnap } = useGlobals();
  const { updateDate } = useGlobals();
  const { lang } = useLang();

  return (
    <div className='josm-update-date'>
      <p className='josm-update-date__update-date m-0'>
        <span>
          {lang === 'ja' ? 'データ更新日：' : 'Data updated on:'}
        </span>
        <span>{'\u00A0'}</span>
        <span>{getFormattedDate(updateDate, lang)}</span>
      </p>
      <p className='josm-update-date__range m-0'>
        <FormattedMessage
          values={{
            date: getFormattedDate(updateDate, lang),
            endDate: lastObservationSnap,
            startDate: '2018',
          }}
          id='app.sante.update.date'
          defaultMessage=''
        />
      </p>
    </div>
  );
}
