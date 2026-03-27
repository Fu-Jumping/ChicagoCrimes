import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.main}>
      <div className={styles.sectionHeaderFilterA}>
        <div className={styles.container2}>
          <div className={styles.heading2}>
            <p className={styles.text}>INCIDENT_PROFILING // CLASSIFICATION</p>
          </div>
          <div className={styles.container}>
            <p className={styles.text4}>
              <span className={styles.text2}>SYSTEM_STATUS:&nbsp;</span>
              <span className={styles.text3}>OPTIMIZED</span>
              <span className={styles.text2}>&nbsp;// KERNEL: 4.1.2-ORACLE</span>
            </p>
          </div>
        </div>
        <div className={styles.backgroundBorder}>
          <div className={styles.container4}>
            <p className={styles.text5}>TIME_RANGE</p>
            <div className={styles.options}>
              <div className={styles.imageFill}>
                <div className={styles.container3}>
                  <p className={styles.text6}>LAST_24_HOURS</p>
                </div>
                <img src="../image/mn8g952c-nz8mu72.svg" className={styles.sVg} />
              </div>
            </div>
          </div>
          <div className={styles.verticalDivider} />
          <div className={styles.container6}>
            <div className={styles.container5}>
              <p className={styles.text7}>PRECISION_LEVEL</p>
            </div>
            <p className={styles.text6}>HIGH_FIDELITY</p>
          </div>
          <div className={styles.button}>
            <p className={styles.text8}>REFRESH_BUFFER</p>
          </div>
        </div>
      </div>
      <div className={styles.statusAlertArea}>
        <div className={styles.container8}>
          <img src="../image/mn8g952c-qhppzxy.svg" className={styles.container7} />
          <p className={styles.text12}>
            <span className={styles.text9}>Anomalous spike detected in&nbsp;</span>
            <span className={styles.text10}>District_04</span>
            <span className={styles.text9}>&nbsp;// Classification:&nbsp;</span>
            <span className={styles.text11}>Cyber_Trespass</span>
          </p>
        </div>
        <p className={styles.text13}>LOG_ID: 0x88F2...</p>
      </div>
      <div className={styles.bentoGridContent}>
        <div className={styles.autoWrapper2}>
          <div className={styles.topLeftTypeProportio}>
            <div className={styles.heading3}>
              <div className={styles.background} />
              <p className={styles.text14}>INCIDENT_TYPE_DISTRIBUTION</p>
            </div>
            <img
              src="../image/mn8g952c-72l4a8e.svg"
              className={styles.container9}
            />
            <div className={styles.container17}>
              <div className={styles.container11}>
                <div className={styles.autoWrapper}>
                  <img
                    src="../image/mn8g952c-uzrkilf.png"
                    className={styles.sVg2}
                  />
                </div>
                <div className={styles.container10}>
                  <p className={styles.text15}>1,284</p>
                  <p className={styles.text16}>TOTAL_EVENTS</p>
                </div>
              </div>
              <div className={styles.container16}>
                <div className={styles.container12}>
                  <div className={styles.background2} />
                  <p className={styles.text17}>Theft (54%)</p>
                </div>
                <div className={styles.container13}>
                  <div className={styles.background3} />
                  <p className={styles.text18}>Assault (22%)</p>
                </div>
                <div className={styles.container14}>
                  <div className={styles.background4} />
                  <p className={styles.text19}>Narcotics (12%)</p>
                </div>
                <div className={styles.container15}>
                  <div className={styles.background5} />
                  <p className={styles.text20}>Others (12%)</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.topRightDomesticProp}>
            <div className={styles.heading32}>
              <div className={styles.background6} />
              <p className={styles.text21}>DOMESTIC_VS_PUBLIC_RATIO</p>
            </div>
            <div className={styles.container20}>
              <div className={styles.container18}>
                <div className={styles.backgroundBorder2}>
                  <div className={styles.margin}>
                    <p className={styles.text22}>DOMESTIC</p>
                  </div>
                  <p className={styles.text23}>38.2%</p>
                  <div className={styles.margin2}>
                    <div className={styles.background7}>
                      <div className={styles.backgroundShadow} />
                    </div>
                  </div>
                </div>
                <div className={styles.backgroundBorder3}>
                  <div className={styles.margin3}>
                    <p className={styles.text24}>PUBLIC</p>
                  </div>
                  <p className={styles.text25}>61.8%</p>
                  <div className={styles.margin4}>
                    <div className={styles.background8}>
                      <div className={styles.backgroundShadow2} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.container19}>
                <p className={styles.text26}>
                  "Significant increase in domestic escalations recorded between
                  02:00 and 05:00 hours.
                  <br />
                  Recommended patrol reallocation to residential zones."
                </p>
              </div>
            </div>
            <img
              src="../image/mn8g952c-7oauv1l.svg"
              className={styles.container21}
            />
          </div>
        </div>
        <div className={styles.bottomArrestRateByTy}>
          <div className={styles.container25}>
            <div className={styles.heading33}>
              <div className={styles.background9} />
              <p className={styles.text27}>ARREST_EFFICIENCY_BY_INCIDENT_TYPE</p>
            </div>
            <div className={styles.container24}>
              <div className={styles.container22}>
                <div className={styles.backgroundShadow3} />
                <p className={styles.text28}>Active_Closure</p>
              </div>
              <div className={styles.container23}>
                <div className={styles.background10} />
                <p className={styles.text28}>Pending_Review</p>
              </div>
            </div>
          </div>
          <div className={styles.container31}>
            <div className={styles.barItem1}>
              <div className={styles.container26}>
                <p className={styles.text29}>Vandalism // Code_402</p>
                <p className={styles.text30}>88.4%</p>
              </div>
              <div className={styles.container28}>
                <div className={styles.overlayVerticalBorde}>
                  <div className={styles.container27}>
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                    <div className={styles.background11} />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.barItem2}>
              <div className={styles.container26}>
                <p className={styles.text29}>Narcotics // Code_808</p>
                <p className={styles.text30}>64.1%</p>
              </div>
              <div className={styles.backgroundBorder4}>
                <div className={styles.overlayVerticalBorde2} />
              </div>
            </div>
            <div className={styles.barItem3}>
              <div className={styles.container29}>
                <p className={styles.text31}>Burglary // Code_210</p>
                <p className={styles.text30}>42.9%</p>
              </div>
              <div className={styles.backgroundBorder5}>
                <div className={styles.overlayVerticalBorde3} />
              </div>
            </div>
            <div className={styles.barItem4}>
              <div className={styles.container30}>
                <p className={styles.text32}>Assault // Code_115</p>
                <p className={styles.text30}>12.5%</p>
              </div>
              <div className={styles.backgroundBorder6}>
                <div className={styles.overlayVerticalBorde4} />
              </div>
            </div>
          </div>
          <div className={styles.horizontalBorder}>
            <p className={styles.text33}>0% BASELINE</p>
            <p className={styles.text16}>25% QUARTILE</p>
            <p className={styles.text5}>50% MEDIAN</p>
            <p className={styles.text34}>75% UPPER_QUARTILE</p>
            <p className={styles.text16}>100% MAXIMUM</p>
          </div>
        </div>
      </div>
      <div className={styles.container34}>
        <div className={styles.button2}>
          <img src="../image/mn8g952c-c3cbvj8.svg" className={styles.container32} />
          <p className={styles.text35}>REQUEST_DEBUG_PANEL</p>
        </div>
        <div className={styles.container33}>
          <p className={styles.text36}>GEO_COORD: 41.8781° N, 87.6298° W</p>
          <p className={styles.text37}>LATENCY: 14ms</p>
          <p className={styles.text38}>ENCRYPTION: AES-256-HUD</p>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <div className={styles.container36}>
          <div className={styles.shadow}>
            <p className={styles.text39}>URBAN ORACLE</p>
          </div>
          <div className={styles.margin5}>
            <div className={styles.verticalDivider2} />
          </div>
          <div className={styles.container35}>
            <div className={styles.link}>
              <p className={styles.text40}>CITY STATS</p>
            </div>
            <div className={styles.link2}>
              <p className={styles.text41}>LIVE FEED</p>
            </div>
            <div className={styles.link3}>
              <p className={styles.text42}>ARCHIVES</p>
            </div>
            <div className={styles.link4}>
              <p className={styles.text43}>SYSTEM</p>
            </div>
          </div>
        </div>
        <div className={styles.container39}>
          <div className={styles.button3}>
            <img
              src="../image/mn8g952c-qn2k3xb.svg"
              className={styles.container37}
            />
          </div>
          <div className={styles.button4}>
            <img
              src="../image/mn8g952c-jcgyhfw.svg"
              className={styles.container38}
            />
          </div>
        </div>
      </div>
      <div className={styles.sideNavBarHiddenOnMo}>
        <div className={styles.link5}>
          <img src="../image/mn8g952c-g3qqv0d.svg" className={styles.container40} />
          <p className={styles.text44}>Overview</p>
        </div>
        <div className={styles.link6}>
          <img src="../image/mn8g952c-jmmgxc6.svg" className={styles.container41} />
          <p className={styles.text45}>Forensics</p>
          <div className={styles.horizontalDivider} />
        </div>
        <div className={styles.link7}>
          <img src="../image/mn8g952c-tvzpzbs.svg" className={styles.container42} />
          <p className={styles.text46}>Telemetry</p>
        </div>
        <div className={styles.link8}>
          <img src="../image/mn8g952c-q9dgi0o.svg" className={styles.container43} />
          <p className={styles.text44}>Terminal</p>
        </div>
      </div>
      <div className={styles.visualPolishScannerL}>
        <div className={styles.horizontalDivider2} />
      </div>
    </div>
  );
}

export default Component;
