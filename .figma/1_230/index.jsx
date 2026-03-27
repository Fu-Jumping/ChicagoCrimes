import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.districtAnalysis}>
      <div className={styles.main}>
        <div className={styles.sectionHeaderFilterA}>
          <div className={styles.container2}>
            <div className={styles.heading2}>
              <p className={styles.text}>GEOSPATIAL_DISTRIBUTION // DISTRICTS</p>
            </div>
            <div className={styles.container}>
              <p className={styles.text2}>
                Live Telemetry: Chicago_Hub / Sector_04 / Analysis_Mode
              </p>
            </div>
          </div>
          <div className={styles.backgroundBorder}>
            <div className={styles.container4}>
              <p className={styles.text3}>TIMEFRAME</p>
              <div className={styles.options}>
                <div className={styles.imageFill}>
                  <img src="../image/mn8g8yme-psmr8o1.svg" className={styles.sVg} />
                  <div className={styles.container3}>
                    <p className={styles.text4}>LAST_24_HOURS</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.verticalDivider} />
            <div className={styles.button}>
              <img
                src="../image/mn8g8yme-yvxyavl.svg"
                className={styles.container5}
              />
              <p className={styles.text5}>Apply_Filters</p>
            </div>
          </div>
        </div>
        <div className={styles.statusAlertBar}>
          <div className={styles.container7}>
            <img
              src="../image/mn8g8yme-gyvctui.svg"
              className={styles.container6}
            />
            <p className={styles.text8}>
              <span className={styles.text6}>SYSTEM_STATUS:&nbsp;</span>
              <span className={styles.text7}>OPTIMAL</span>
              <span className={styles.text6}>
                &nbsp;// DATA_LATENCY: 14ms // MONITORING_ACTIVE
              </span>
            </p>
          </div>
          <p className={styles.text9}>LOG_ID: 0xFF-4829-AZ</p>
          <div className={styles.overlay} />
        </div>
        <div className={styles.mainChartStack}>
          <div className={styles.districtsComparisonC}>
            <div className={styles.container10}>
              <div className={styles.container8}>
                <p className={styles.telemetry01}>Telemetry_01</p>
                <p className={styles.text10}>DISTRICT_COMPARATIVE_VOLUME</p>
              </div>
              <div className={styles.container9}>
                <div className={styles.background} />
                <p className={styles.text11}>Total_Incidents</p>
              </div>
            </div>
            <div className={styles.visualBarChart}>
              <div className={styles.gridLines}>
                <div className={styles.horizontalDivider} />
                <div className={styles.horizontalDivider} />
                <div className={styles.horizontalDivider} />
                <div className={styles.horizontalDivider} />
              </div>
              <div className={styles.barsRepresenting10Di}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_01</p>
              </div>
              <div className={styles.container11}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_02</p>
              </div>
              <div className={styles.container12}>
                <div className={styles.horizontalDivider3} />
                <p className={styles.text13}>DIST_03</p>
              </div>
              <div className={styles.container13}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_04</p>
              </div>
              <div className={styles.container14}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_05</p>
              </div>
              <div className={styles.container15}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_06</p>
              </div>
              <div className={styles.container16}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_07</p>
              </div>
              <div className={styles.container17}>
                <div className={styles.horizontalDivider2} />
                <p className={styles.text12}>DIST_08</p>
              </div>
            </div>
            <div className={styles.cardAccents}>
              <div className={styles.background2} />
              <div className={styles.background2} />
              <div className={styles.background2} />
            </div>
          </div>
          <div className={styles.locationTypesCard}>
            <div className={styles.container18}>
              <p className={styles.telemetry02}>Telemetry_02</p>
              <p className={styles.tOp15Hotspotcategori}>
                TOP_15_HOTSPOT_CATEGORIES
              </p>
            </div>
            <div className={styles.container35}>
              <div className={styles.autoWrapper}>
                <div className={styles.horizontalBarsForLoc}>
                  <div className={styles.container19}>
                    <p className={styles.text14}>Street_Transit</p>
                    <p className={styles.text15}>4,289</p>
                  </div>
                  <div className={styles.background3}>
                    <div className={styles.backgroundShadow} />
                  </div>
                </div>
                <div className={styles.container21}>
                  <div className={styles.container20}>
                    <p className={styles.text16}>Public_Park</p>
                    <p className={styles.text15}>2,845</p>
                  </div>
                  <div className={styles.background4}>
                    <div className={styles.backgroundShadow2} />
                  </div>
                </div>
                <div className={styles.moreTypesCanFollowSh}>
                  <div className={styles.container22}>
                    <p className={styles.text17}>Skyway_Access</p>
                    <p className={styles.text15}>1,822</p>
                  </div>
                  <div className={styles.background5}>
                    <div className={styles.backgroundShadow3} />
                  </div>
                </div>
              </div>
              <div className={styles.autoWrapper2}>
                <div className={styles.container24}>
                  <div className={styles.container23}>
                    <p className={styles.text18}>Residential_Unit</p>
                    <p className={styles.text15}>3,912</p>
                  </div>
                  <div className={styles.background6}>
                    <div className={styles.backgroundShadow4} />
                  </div>
                </div>
                <div className={styles.container26}>
                  <div className={styles.container25}>
                    <p className={styles.text19}>Industrial_Sector</p>
                    <p className={styles.text15}>2,110</p>
                  </div>
                  <div className={styles.background7}>
                    <div className={styles.backgroundShadow5} />
                  </div>
                </div>
                <div className={styles.container28}>
                  <div className={styles.container27}>
                    <p className={styles.text20}>Server_Farms</p>
                    <p className={styles.text15}>1,501</p>
                  </div>
                  <div className={styles.background8}>
                    <div className={styles.backgroundShadow6} />
                  </div>
                </div>
              </div>
              <div className={styles.autoWrapper3}>
                <div className={styles.container30}>
                  <div className={styles.container29}>
                    <p className={styles.text19}>Commercial_Retail</p>
                    <p className={styles.text15}>3,102</p>
                  </div>
                  <div className={styles.background9}>
                    <div className={styles.backgroundShadow7} />
                  </div>
                </div>
                <div className={styles.container32}>
                  <div className={styles.container31}>
                    <p className={styles.text17}>Tech_District</p>
                    <p className={styles.text21}>1,942</p>
                  </div>
                  <div className={styles.background10}>
                    <div className={styles.backgroundShadow8} />
                  </div>
                </div>
                <div className={styles.container34}>
                  <div className={styles.container33}>
                    <p className={styles.text16}>Port_Harbor</p>
                    <p className={styles.text15}>1,219</p>
                  </div>
                  <div className={styles.background11}>
                    <div className={styles.backgroundShadow9} />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.container37}>
              <div className={styles.button2}>
                <p className={styles.text22}>Expand_Detailed_List</p>
                <img
                  src="../image/mn8g8yme-p9l3pa5.svg"
                  className={styles.container36}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.headerTopNavBarImple}>
          <div className={styles.container38}>
            <div className={styles.shadow}>
              <p className={styles.text23}>URBAN ORACLE</p>
            </div>
            <div className={styles.nav}>
              <div className={styles.link}>
                <p className={styles.text24}>CITY STATS</p>
              </div>
              <div className={styles.link2}>
                <p className={styles.text25}>LIVE FEED</p>
              </div>
              <div className={styles.link3}>
                <p className={styles.text26}>ARCHIVES</p>
              </div>
              <div className={styles.link4}>
                <p className={styles.text27}>SYSTEM</p>
              </div>
            </div>
          </div>
          <div className={styles.container40}>
            <div className={styles.button3}>
              <img
                src="../image/mn8g8yme-7mukvnv.svg"
                className={styles.container6}
              />
            </div>
            <div className={styles.button4}>
              <img
                src="../image/mn8g8yme-fn4s50m.svg"
                className={styles.container39}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.button5}>
        <div className={styles.container42}>
          <img src="../image/mn8g8yme-gtabdz5.svg" className={styles.container41} />
          <p className={styles.text28}>Request_Debug_Panel</p>
        </div>
        <img src="../image/mn8g8yme-acs6hyx.svg" className={styles.container43} />
      </div>
      <div className={styles.bottomNavBarImplemen}>
        <div className={styles.nav2}>
          <div className={styles.link5}>
            <img
              src="../image/mn8g8yme-mpea29q.svg"
              className={styles.container44}
            />
            <div className={styles.margin}>
              <p className={styles.text29}>Overview</p>
            </div>
          </div>
          <div className={styles.link6}>
            <img
              src="../image/mn8g8yme-yod0ov5.svg"
              className={styles.container39}
            />
            <div className={styles.margin2}>
              <p className={styles.text30}>Forensics</p>
            </div>
          </div>
          <div className={styles.link7}>
            <img
              src="../image/mn8g8yme-4wg1hw5.svg"
              className={styles.container45}
            />
            <div className={styles.margin3}>
              <p className={styles.text31}>Telemetry</p>
            </div>
            <div className={styles.horizontalDivider4} />
          </div>
          <div className={styles.link8}>
            <img
              src="../image/mn8g8yme-7vb8szz.svg"
              className={styles.container41}
            />
            <div className={styles.margin}>
              <p className={styles.text29}>Terminal</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.gradient} />
    </div>
  );
}

export default Component;
