import {
  Button,
  Col,
  Container,
  Icon as DSIcon,
  Link as DSLink,
  Row,
} from '@dataesr/react-dsfr';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import GlossaryJSON from '../../translations/glossary.json';
import { getAllIndexes } from '../../utils/helpers';
import GlossaryItem from './GlossaryItem';

const allGlossaries = GlossaryJSON[0];

function Glossary({ entries }) {
  const { pathname } = useLocation();
  const intl = useIntl();
  const contentRef = useRef();
  const [openPanel, setOpenPanel] = useState(false);
  const [glossaryEntries, setGlossaryEntries] = useState([]);
  const [activeKey, setActiveKey] = useState('');

  const activeClassManage = useCallback((glossaryKey = '', action) => {
    if (glossaryKey) {
      const activeClassObj = {
        remove: (elm) => elm.classList.remove('active'),
        add: (elm) => elm.classList.add('active'),
      };
      const glossaryKeyElement = document.querySelector(
        `[data-glossary-key=${glossaryKey}]`,
      );
      activeClassObj[action](glossaryKeyElement);
    }
  }, []);

  const glossaryPanel = useCallback(
    (key, open) => {
      activeClassManage(activeKey, 'remove');
      setActiveKey(key);
      setOpenPanel(open);
    },
    [activeKey, setActiveKey, setOpenPanel, activeClassManage],
  );

  const onClickEntry = useCallback(
    (glossaryKey) => {
      glossaryPanel(glossaryKey, true);
      activeClassManage(glossaryKey, 'add');

      const glossaryEntry = document.querySelector(
        `[data-glossary-entry='${glossaryKey}']`,
      );

      if (glossaryEntry && contentRef.current) {
        contentRef.current.scrollTop = glossaryEntry.offsetTop - 15;
      }
    },
    [glossaryPanel, activeClassManage],
  );

  useEffect(() => {
    if (glossaryEntries.length > 0) {
      for (let i = 0; i < glossaryEntries.length; i += 1) {
        const rootElement = document.querySelector('body');

        rootElement.addEventListener(
          'click',
          (event) => {
            const currentKey = glossaryEntries[i].dataset.glossaryKey;
            const targetKey = event.target.dataset.glossaryKey;

            if (targetKey === currentKey) {
              onClickEntry(targetKey);
            }
          },
          true,
        );
      }
    }
  }, [onClickEntry, glossaryEntries]);

  const customFilter = useCallback((array, cb) => {
    const innerKeys = array.map((elm) => elm.innerHTML);
    let a = [];

    for (let i = 0; i < innerKeys.length; i += 1) {
      // Check several occurrences
      if (
        innerKeys.indexOf(innerKeys[i]) !== innerKeys.lastIndexOf(innerKeys[i])
      ) {
        a = getAllIndexes(innerKeys, innerKeys[i]);
      }
    }

    cb(array.filter((elm, index) => a.slice(1).indexOf(index) === -1));
  }, []);

  useEffect(() => {
    const arrGlossaryEntries = Array.from(
      document.querySelectorAll('.glossary-entry'),
    );

    customFilter(arrGlossaryEntries, (filtered) => {
      const glossaryLength = glossaryEntries.length;
      const glossaryEntriesLength = filtered.length;

      if (
        (!glossaryLength && glossaryEntriesLength > 0)
        || glossaryLength !== glossaryEntriesLength
      ) {
        setGlossaryEntries(filtered);
      }
    });
  }, [customFilter, glossaryEntries, pathname]);

  useEffect(() => {
    if (openPanel) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('overlay-on');
    } else {
      document.body.style.overflow = openPanel ? 'hidden' : '';
      document.documentElement.classList.remove('overlay-on');
    }
  }, [openPanel]);

  return (
    <section className={classNames('bso-glossary z-4000', { openPanel })}>
      <Container fluid className='josm-glossary-container'>
        <DSIcon name='ri-information-fill' size='1x' iconPosition='left'>
          <Button
            className='josm-btn'
            onClick={() => glossaryPanel('', !openPanel)}
          >
            <FormattedMessage
              id='app.header.nav.a-propos-glossaire'
              defaultMessage='Glossaire'
            />
          </Button>
        </DSIcon>
        <Row className='josm-glossary-rows'>
          <Col n='12' className='wrapper-title'>
            <Row>
              <Col n='6'>
                <div className='fs-24-36 notosans-bold'>
                  <FormattedMessage
                    id='app.glossary.title'
                    defaultMessage='Glossaire de la page'
                  />
                </div>
              </Col>
              <Col n='6' className='text-right'>
                <button
                  className='close'
                  type='button'
                  onClick={() => glossaryPanel('', false)}
                >
                  <DSIcon
                    className='ds-fr--v-middle'
                    name='ri-close-large-fill'
                    size='lg'
                    iconPosition='right'
                  >
                    <span>
                      <FormattedMessage
                        id='app.commons.close'
                        defaultMessage='Fermer'
                      />
                    </span>
                  </DSIcon>
                </button>
              </Col>
            </Row>
          </Col>
          <Col n='12' className='content-wrapper'>
            <div ref={contentRef} className='content relative'>
              {Object.keys(allGlossaries).map((key, i) => {
                const currentEntry = entries[0][key];

                return (
                  <GlossaryItem
                    glossaryKey={key}
                    key={key}
                    intlDefinition={currentEntry.intlDefinition}
                    active={key === activeKey}
                    intlEntry={currentEntry.intlEntry}
                    className={i === 0 ? 'pt-20' : ''}
                    link={currentEntry.ctas || currentEntry.cta || null}
                  />
                );
              })}
            </div>
          </Col>
        </Row>
        {/* <Row>
          <Col n='12'>
            <DSLink
              className='to-glossary-page'
              icon='ri-arrow-right-line'
              iconSize='lg'
              href={intl.formatMessage({
                id: 'url.about.glossaire',
              })}
            >
              {intl.formatMessage({
                id: 'app.glossary.complete',
                defaultMessage:
                  'Toutes les définitions dans le glossaire complet',
              })}
            </DSLink>
          </Col>
        </Row> */}
      </Container>
    </section>
  );
}

Glossary.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};
export default Glossary;
