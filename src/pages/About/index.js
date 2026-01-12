import { Col, Container, Row } from '@dataesr/react-dsfr';
import React, { useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import Banner from '../../components/Banner';
import useLang from '../../utils/Hooks/useLang';

function About() {
  const intl = useIntl();
  const { lang } = useLang();

  useEffect(() => {
    if (lang === 'ja') {
      document.title = 'About | Japan Open Science Monitor試験版';
    } else {
      document.title = 'About | Japan Open Science Monitor β';
    }
  }, [lang]);

  return (
    <div className='about'>
      <Banner
        supTitle={<FormattedMessage id='app.header.title' />}
        title={<FormattedMessage id='app.header.nav.a-propos' />}
      />
      <Container className='mb-100'>
        <section className='content'>
          <Row gutters>
            <Col n='12'>
              <h3>{intl.formatMessage({ id: 'app.about.overview' })}</h3>
              <FormattedMessage
                id='app.about.body'
                values={{
                  p: (chunks) => <p>{chunks}</p>,
                  fosm: () => (
                    <a
                      href='https://frenchopensciencemonitor.esr.gouv.fr/'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      French Open Science Monitor
                    </a>
                  ),
                }}
              />
            </Col>
          </Row>
          <Row gutters>
            <Col n='12'>
              <h3>{intl.formatMessage({ id: 'app.about.background' })}</h3>
              <FormattedMessage
                id='app.about.background.body'
                values={{
                  p: (chunks) => <p>{chunks}</p>,
                  br: <br />,
                  unescorec: () => (
                    <a
                      href='https://www.unesco.org/en/open-science/about'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      UNESCO Recommendation on Open Science
                    </a>
                  ),
                }}
              />
            </Col>
          </Row>
          <Row gutters>
            <Col n='12'>
              <h3>{intl.formatMessage({ id: 'app.about.method' })}</h3>
              <FormattedMessage
                id='app.about.method.body'
                values={{
                  p: (chunks) => <p>{chunks}</p>,
                  br: <br />,
                  fosm: () => (
                    <a
                      href='https://frenchopensciencemonitor.esr.gouv.fr/'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      French Open Science Monitor
                    </a>
                  ),
                  openalex: () => (
                    <a
                      href='https://openalex.org/'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      OpenAlex
                    </a>
                  ),
                }}
              />
            </Col>
          </Row>
          <Row gutters>
            <Col n='12'>
              <h3>{intl.formatMessage({ id: 'app.about.acknowledgement' })}</h3>
              <FormattedMessage
                id='app.about.acknowledgement.body'
                values={{
                  p: (chunks) => <p>{chunks}</p>,
                  dacos: () => (
                    <a
                      href='https://orcid.org/0000-0002-9361-5295'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Marin Dacos
                    </a>
                  ),
                  jeangirard: () => (
                    <a
                      href='https://orcid.org/0000-0002-3767-7125'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Eric Jeangirard
                    </a>
                  ),
                  romary: () => (
                    <a
                      href='https://orcid.org/0000-0002-0756-0508'
                      style={{ marginInline: '0.5em' }}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Laurent Romary
                    </a>
                  ),
                }}
              />
            </Col>
          </Row>
          <Row gutters>
            <Col n='12'>
              <h3>{intl.formatMessage({ id: 'app.about.reference' })}</h3>
              <a href='https://frenchopensciencemonitor.esr.gouv.fr/'>
                French Open Science Monitor
              </a>
              <br />
              <a href='https://openalex.org/' target='_blank' rel='noreferrer'>
                OpenAlex
              </a>
              <br />
              <a href='https://open-science-monitoring.org/monitors/' target='_blank' rel='noreferrer'>
                Monitors -- Open Science Monitoring Intiatives (OSMI)
              </a>
              <br />
              <a href='https://monitor.openaire.eu/' target='_blank' rel='noreferrer'>
                OpenAIRE Monitor
              </a>
            </Col>
          </Row>
        </section>
      </Container>
    </div>
  );
}

export default About;
