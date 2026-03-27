import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.dashboardOverview}>
      <div className={styles.main}>
        <div className={styles.headerFilterControls}>
          <div className={styles.container2}>
            <p className={styles.text3}>
              <span className={styles.text}>OPERATOR_01 //&nbsp;</span>
              <span className={styles.text2}>CITY_DASHBOARD</span>
            </p>
            <div className={styles.container}>
              <p className={styles.text4}>
                SYSTEM_STATUS: NOMINAL // LAST_SYNC: 12:44:02_UTC
              </p>
            </div>
          </div>
          <div className={styles.backgroundBorder}>
            <div className={styles.container4}>
              <p className={styles.text5}>Timeframe</p>
              <div className={styles.options}>
                <div className={styles.imageFill}>
                  <img src="../image/mn8g91jg-wyxjx40.svg" className={styles.sVg} />
                  <div className={styles.container3}>
                    <p className={styles.text6}>YEAR 2020-2023</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.verticalDivider} />
            <div className={styles.container6}>
              <p className={styles.text7}>Primary Type</p>
              <div className={styles.options2}>
                <div className={styles.imageFill2}>
                  <img src="../image/mn8g91jg-wyxjx40.svg" className={styles.sVg} />
                  <div className={styles.container5}>
                    <p className={styles.text8}>ALL_INCIDENTS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.statusAlertBar}>
          <img src="../image/mn8g91jg-qotzidt.svg" className={styles.container7} />
          <p className={styles.text9}>
            LIVE_FEED: UNUSUAL ACTIVITY DETECTED IN DISTRICT_07 // COORDINATES:
            41.8781° N, 87.6298° W
          </p>
          <div className={styles.margin}>
            <div className={styles.container8}>
              <div className={styles.background} />
              <p className={styles.text10}>REAL_TIME_LINK_ACTIVE</p>
            </div>
          </div>
        </div>
        <div className={styles.bentoGrid}>
          <div className={styles.yearlyTrendFullWidth}>
            <div className={styles.container12}>
              <div className={styles.container10}>
                <div className={styles.heading3}>
                  <div className={styles.background2} />
                  <p className={styles.text11}>Yearly Incident Trend</p>
                </div>
                <div className={styles.container9}>
                  <p className={styles.text12}>TOTAL_VOLUME_AGGREGATE_VIEW</p>
                </div>
              </div>
              <div className={styles.container11}>
                <div className={styles.button}>
                  <p className={styles.text13}>EXPORT_CSV</p>
                </div>
                <div className={styles.button2}>
                  <p className={styles.text14}>DETAILS</p>
                </div>
              </div>
            </div>
            <img src="../image/mn8g91jg-fsjh3wf.svg" className={styles.sVg2} />
            <div className={styles.legendXAxis}>
              <p className={styles.text15}>JAN_2020</p>
              <p className={styles.text15}>JUL_2020</p>
              <p className={styles.text15}>JAN_2021</p>
              <p className={styles.text15}>JUL_2021</p>
              <p className={styles.text15}>JAN_2022</p>
              <p className={styles.text15}>JUL_2022</p>
              <p className={styles.text15}>JAN_2023</p>
            </div>
          </div>
          <div className={styles.autoWrapper2}>
            <div className={styles.typeProportionHalfWi}>
              <div className={styles.container13}>
                <div className={styles.heading32}>
                  <div className={styles.background3} />
                  <p className={styles.text16}>Proportion Top 5</p>
                </div>
                <p className={styles.iNcidentclassificati}>
                  INCIDENT_CLASSIFICATION_DISTRIBUTION
                </p>
              </div>
              <div className={styles.container26}>
                <div className={styles.donutSimulation}>
                  <div className={styles.autoWrapper}>
                    <img
                      src="../image/mn8g91jg-03pa4fu.png"
                      className={styles.sVg3}
                    />
                  </div>
                  <div className={styles.container14}>
                    <p className={styles.text17}>88%</p>
                    <p className={styles.text18}>CONFIRMED</p>
                  </div>
                </div>
                <div className={styles.container25}>
                  <div className={styles.container16}>
                    <div className={styles.container15}>
                      <div className={styles.background4} />
                      <p className={styles.text19}>THEFT</p>
                    </div>
                    <p className={styles.text20}>40.2%</p>
                  </div>
                  <div className={styles.container18}>
                    <div className={styles.container17}>
                      <div className={styles.background5} />
                      <p className={styles.text21}>BATTERY</p>
                    </div>
                    <p className={styles.text22}>25.8%</p>
                  </div>
                  <div className={styles.container20}>
                    <div className={styles.container19}>
                      <div className={styles.background6} />
                      <p className={styles.text23}>NARCOTICS</p>
                    </div>
                    <p className={styles.text24}>15.1%</p>
                  </div>
                  <div className={styles.container22}>
                    <div className={styles.container21}>
                      <div className={styles.background7} />
                      <p className={styles.text21}>ASSAULT</p>
                    </div>
                    <p className={styles.text25}>10.4%</p>
                  </div>
                  <div className={styles.container24}>
                    <div className={styles.container23}>
                      <div className={styles.background8} />
                      <p className={styles.text19}>OTHER</p>
                    </div>
                    <p className={styles.text26}>8.5%</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.districtComparisonHa}>
              <div className={styles.container27}>
                <div className={styles.heading33}>
                  <div className={styles.background2} />
                  <p className={styles.text27}>District Comparison</p>
                </div>
                <p className={styles.iNcidentclassificati}>
                  INCIDENT_DENSITY_TOP_10_UNITS
                </p>
              </div>
              <div className={styles.container35}>
                <div className={styles.barChartSim}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_08</p>
                    <p className={styles.text29}>4,291</p>
                  </div>
                  <div className={styles.background10}>
                    <div className={styles.background9} />
                  </div>
                </div>
                <div className={styles.container29}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_01</p>
                    <p className={styles.text29}>3,842</p>
                  </div>
                  <div className={styles.background12}>
                    <div className={styles.background11} />
                  </div>
                </div>
                <div className={styles.container30}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_11</p>
                    <p className={styles.text29}>3,105</p>
                  </div>
                  <div className={styles.background14}>
                    <div className={styles.background13} />
                  </div>
                </div>
                <div className={styles.container31}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_18</p>
                    <p className={styles.text29}>2,988</p>
                  </div>
                  <div className={styles.background16}>
                    <div className={styles.background15} />
                  </div>
                </div>
                <div className={styles.container32}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_04</p>
                    <p className={styles.text29}>2,442</p>
                  </div>
                  <div className={styles.background18}>
                    <div className={styles.background17} />
                  </div>
                </div>
                <div className={styles.container33}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_06</p>
                    <p className={styles.text29}>2,100</p>
                  </div>
                  <div className={styles.background20}>
                    <div className={styles.background19} />
                  </div>
                </div>
                <div className={styles.container34}>
                  <div className={styles.container28}>
                    <p className={styles.text28}>D_25</p>
                    <p className={styles.text29}>1,980</p>
                  </div>
                  <div className={styles.background22}>
                    <div className={styles.background21} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.headerTopNavBar}>
          <div className={styles.heading1}>
            <p className={styles.text30}>URBAN ORACLE</p>
          </div>
          <div className={styles.nav}>
            <div className={styles.link}>
              <p className={styles.text31}>CITY STATS</p>
            </div>
            <p className={styles.text32}>LIVE FEED</p>
            <p className={styles.text33}>ARCHIVES</p>
            <p className={styles.text34}>SYSTEM</p>
          </div>
          <div className={styles.container38}>
            <div className={styles.button3}>
              <img
                src="../image/mn8g91jg-xu5cpb6.svg"
                className={styles.container36}
              />
            </div>
            <div className={styles.button4}>
              <img
                src="../image/mn8g91jg-ccbollf.svg"
                className={styles.container37}
              />
            </div>
          </div>
        </div>
        <div className={styles.nav2}>
          <div className={styles.link2}>
            <img
              src="../image/mn8g91jg-y5vzop3.svg"
              className={styles.container39}
            />
            <p className={styles.text35}>Overview</p>
          </div>
          <div className={styles.link3}>
            <img
              src="../image/mn8g91jg-jd3c22k.svg"
              className={styles.container37}
            />
            <p className={styles.text36}>Forensics</p>
          </div>
          <div className={styles.link4}>
            <img
              src="../image/mn8g91jg-tmbzxxm.svg"
              className={styles.container40}
            />
            <p className={styles.text36}>Telemetry</p>
          </div>
          <div className={styles.link5}>
            <img
              src="../image/mn8g91jg-ojzheqm.svg"
              className={styles.container41}
            />
            <p className={styles.text37}>Terminal</p>
          </div>
        </div>
        <div className={styles.activeIndicator} />
      </div>
      <div className={styles.backgroundHorizontal}>
        <div className={styles.button5}>
          <div className={styles.container43}>
            <img
              src="../image/mn8g91jg-zi12em7.svg"
              className={styles.container42}
            />
            <p className={styles.text38}>Request Debug Panel</p>
          </div>
          <img src="../image/mn8g91jg-gmhzhhm.svg" className={styles.container44} />
        </div>
      </div>
      <div className={styles.gradient} />
    </div>
  );
}

export default Component;
