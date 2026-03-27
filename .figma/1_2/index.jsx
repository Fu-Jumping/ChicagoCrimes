import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.trendAnalysis}>
      <div className={styles.backgroundDecoration}>
        <img
          src="../image/mn8g8urp-8fo7x5l.png"
          className={styles.urbanOracleChicagoBa}
        />
      </div>
      <div className={styles.main}>
        <div className={styles.headerFilterArea}>
          <div className={styles.container3}>
            <div className={styles.container}>
              <div className={styles.background} />
              <p className={styles.text}>SYSTEM // LIVE_SYNC_ACTIVE</p>
            </div>
            <div className={styles.heading2}>
              <p className={styles.text2}>TEMPORAL_FORENSICS // ANALYSIS</p>
            </div>
            <div className={styles.container2}>
              <p className={styles.text3}>
                Analyzing temporal anomalies and criminal density patterns across
                the Chicago
                <br />
                metropolitan hub. Cross-referencing monthly fluctuations with hourly
                triggers.
              </p>
            </div>
          </div>
          <div className={styles.globalFilters}>
            <div className={styles.verticalBorder}>
              <p className={styles.text4}>Timeframe</p>
              <div className={styles.options}>
                <div className={styles.imageFill}>
                  <img src="../image/mn8g8urf-qzk6at4.svg" className={styles.sVg} />
                  <div className={styles.container4}>
                    <p className={styles.text5}>LAST_30_DAYS</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.container6}>
              <p className={styles.text6}>Sector</p>
              <div className={styles.options2}>
                <div className={styles.imageFill2}>
                  <img src="../image/mn8g8urf-qzk6at4.svg" className={styles.sVg} />
                  <div className={styles.container5}>
                    <p className={styles.text7}>ALL_DISTRICTS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.statusAlertArea}>
          <div className={styles.container10}>
            <img
              src="../image/mn8g8urf-8aj5czv.svg"
              className={styles.container7}
            />
            <div className={styles.container9}>
              <div className={styles.container8}>
                <p className={styles.text8}>Anomaly Detected: Sector 07</p>
              </div>
              <p className={styles.text9}>
                Temporal variance exceeded 14% threshold in the last 120 minutes.
              </p>
            </div>
          </div>
          <div className={styles.button}>
            <p className={styles.text10}>Execute Sweep</p>
          </div>
        </div>
        <div className={styles.bentoGridLayout}>
          <div className={styles.sectionFullWidthTopC}>
            <div className={styles.container16}>
              <div className={styles.container12}>
                <div className={styles.heading3}>
                  <img
                    src="../image/mn8g8urf-rvq2s3a.svg"
                    className={styles.container11}
                  />
                  <p className={styles.text11}>Monthly_Incident_Velocity</p>
                </div>
                <p className={styles.text12}>
                  Historical trend mapping across current fiscal period
                </p>
              </div>
              <div className={styles.container15}>
                <div className={styles.container13}>
                  <div className={styles.background} />
                  <p className={styles.text13}>Incident_Count</p>
                </div>
                <div className={styles.container14}>
                  <div className={styles.background2} />
                  <p className={styles.text14}>Proj_Variance</p>
                </div>
              </div>
            </div>
            <div className={styles.hUdBackgroundElement}>
              <div className={styles.border} />
            </div>
            <div className={styles.monthlyLineChartMock}>
              <div className={styles.gridLines}>
                <div className={styles.horizontalDivider} />
                <div className={styles.horizontalDivider} />
                <div className={styles.horizontalDivider} />
                <div className={styles.horizontalDivider} />
              </div>
              <img src="../image/mn8g8urf-vc2s4q2.svg" className={styles.sVg2} />
            </div>
            <div className={styles.xAxisLabels}>
              <p className={styles.text15}>Jan</p>
              <p className={styles.text15}>Feb</p>
              <p className={styles.text15}>Mar</p>
              <p className={styles.text15}>Apr</p>
              <p className={styles.text15}>May</p>
              <p className={styles.text15}>Jun</p>
              <p className={styles.text15}>Jul</p>
              <p className={styles.text15}>Aug</p>
              <p className={styles.text15}>Sep</p>
              <p className={styles.text15}>Oct</p>
              <p className={styles.text15}>Nov</p>
              <p className={styles.text15}>Dec</p>
            </div>
          </div>
          <div className={styles.autoWrapper}>
            <div className={styles.sectionBottomLeftWee}>
              <div className={styles.container18}>
                <div className={styles.heading32}>
                  <img
                    src="../image/mn8g8urf-jk4dlp6.svg"
                    className={styles.container17}
                  />
                  <p className={styles.text16}>Weekly_Load_Factor</p>
                </div>
                <p className={styles.distributionOfActivi}>
                  Distribution of activities across standard week cycles
                </p>
              </div>
              <div className={styles.container20}>
                <p className={styles.mon}>Mon</p>
                <p className={styles.mon}>Tue</p>
                <p className={styles.mon}>Wed</p>
                <div className={styles.container19}>
                  <div className={styles.horizontalDivider2} />
                  <div className={styles.margin}>
                    <p className={styles.text17}>Thu</p>
                  </div>
                </div>
                <p className={styles.mon}>Fri</p>
                <p className={styles.mon}>Sat</p>
                <p className={styles.mon}>Sun</p>
              </div>
            </div>
            <div className={styles.sectionBottomRightHo}>
              <div className={styles.container22}>
                <div className={styles.heading33}>
                  <img
                    src="../image/mn8g8urf-jspmcsa.svg"
                    className={styles.container21}
                  />
                  <p className={styles.text18}>Circadian_Flow_Rate</p>
                </div>
                <p className={styles.distributionOfActivi}>
                  Anomaly detection within 24-hour cycle periods
                </p>
              </div>
              <div className={styles.circularHudStyleRepr}>
                <div className={styles.border3}>
                  <div className={styles.border2}>
                    <div className={styles.dataPointers} />
                    <p className={styles.text19}>00:00</p>
                    <div className={styles.backgroundShadow} />
                    <p className={styles.text19}>12:00</p>
                  </div>
                </div>
                <div className={styles.statsInCorners}>
                  <div className={styles.container23}>
                    <p className={styles.text4}>Peak_Time</p>
                  </div>
                  <p className={styles.text20}>03:44 AM</p>
                </div>
                <div className={styles.container24}>
                  <p className={styles.text21}>Intensity</p>
                  <p className={styles.text22}>88.4%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.floatingBottomNaviga}>
          <div className={styles.button2}>
            <p className={styles.text23}>dashboard</p>
            <p className={styles.text24}>Home</p>
          </div>
          <div className={styles.button3}>
            <p className={styles.text25}>analytics</p>
            <p className={styles.text26}>Trends</p>
          </div>
          <div className={styles.horizontalDivider3} />
          <div className={styles.button4}>
            <p className={styles.text23}>map</p>
            <p className={styles.text27}>Map</p>
          </div>
          <div className={styles.verticalDivider} />
          <div className={styles.button5}>
            <p className={styles.text23}>person</p>
            <p className={styles.text28}>Profile</p>
          </div>
        </div>
      </div>
      <div className={styles.backgroundHorizontal}>
        <div className={styles.container26}>
          <div className={styles.container25}>
            <p className={styles.text29}>LAT: 41.8781° N</p>
            <p className={styles.text29}>LON: 87.6298° W</p>
            <p className={styles.text30}>TEMP: 18.5°C</p>
          </div>
        </div>
        <div className={styles.container27}>
          <div className={styles.background3} />
          <p className={styles.text31}>Encrypted_Channel_A1</p>
        </div>
      </div>
      <div className={styles.asideSideNavigationW}>
        <div className={styles.container29}>
          <p className={styles.oPerator01}>OPERATOR_01</p>
          <div className={styles.container28}>
            <p className={styles.cHicagohub}>CHICAGO_HUB</p>
          </div>
        </div>
        <div className={styles.nav}>
          <div className={styles.link}>
            <img
              src="../image/mn8g8urf-pxpfhre.svg"
              className={styles.container30}
            />
            <p className={styles.text32}>Overview</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../image/mn8g8urf-28hiwyh.svg"
              className={styles.container31}
            />
            <p className={styles.text33}>Forensics</p>
          </div>
          <div className={styles.link3}>
            <img
              src="../image/mn8g8urf-ubr0pyr.svg"
              className={styles.container31}
            />
            <p className={styles.text34}>Telemetry</p>
          </div>
          <div className={styles.link4}>
            <img
              src="../image/mn8g8urf-7glrd95.svg"
              className={styles.container32}
            />
            <p className={styles.text32}>Terminal</p>
          </div>
        </div>
      </div>
      <div className={styles.topNavigationBar}>
        <div className={styles.container34}>
          <div className={styles.shadow}>
            <p className={styles.text35}>URBAN ORACLE</p>
          </div>
          <div className={styles.container33}>
            <div className={styles.link5}>
              <p className={styles.text36}>CITY STATS</p>
            </div>
            <div className={styles.link6}>
              <p className={styles.text37}>LIVE FEED</p>
            </div>
            <div className={styles.link7}>
              <p className={styles.text38}>ARCHIVES</p>
            </div>
            <div className={styles.link8}>
              <p className={styles.text39}>SYSTEM</p>
            </div>
          </div>
        </div>
        <div className={styles.container37}>
          <div className={styles.button6}>
            <img
              src="../image/mn8g8urf-xxlapdo.svg"
              className={styles.container35}
            />
          </div>
          <div className={styles.button7}>
            <img
              src="../image/mn8g8urf-e3rcw14.svg"
              className={styles.container36}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
