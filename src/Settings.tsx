import React from 'react';
import { makeAutoObservable } from "mobx"
import { observer } from "mobx-react"
import { createContext, useContext } from "react"
import { Dropdown, DropdownProps, Button } from 'semantic-ui-react';
import AppState from './AppState'

const styles = require('./Settings.css'); // Use require here to dodge "cannot find module" errors in VS Code

const baudRates = [9600, 57600];

// Create structure for combobox
const baudRateOptions = baudRates.map((baudRate) => {
  return { key: baudRate, value: baudRate, text: baudRate.toString() };
});

const numDataBitsA = [5, 6, 7, 8, 9];

// Create structure for combobox
const numDataBitsAOptions = numDataBitsA.map((numDataBits) => {
  return { key: numDataBits, value: numDataBits, text: numDataBits.toString() };
});

const parities = ['none', 'even', 'mark', 'odd', 'space'];

// Create structure for combobox
const parityOptions = parities.map((parity) => {
  return { key: parity, value: parity, text: parity };
});

const numStopBitsA = [1, 2];

// Create structure for combobox
const numStopBitsAOptions = numStopBitsA.map((numStopBits) => {
  return { key: numStopBits, value: numStopBits, text: numStopBits.toString() };
});

const SettingsView = observer((props) => {

  const app: AppState = props.app

  const parameterNameWidth = 100;

  const serialPortInfoRows = app.serialPortInfos.map((serialPortInfo) => {
    return {
      key: serialPortInfo.path,
      text: serialPortInfo.path,
      value: serialPortInfo.path,
      content: (
        <div>
          <span style={{ display: 'inline-block', width: '70px' }}>{serialPortInfo.path}</span>
          <span style={{ display: 'inline-block', width: '150px' }}>{serialPortInfo.manufacturer}</span>
          <span style={{ display: 'inline-block', width: '150px' }}>{serialPortInfo.locationId}</span>
        </div>
      )
    };
  });
  if (serialPortInfoRows.length === 0) {
    serialPortInfoRows.push({
      key: 'none',
      text: 'No serial ports found',
      value: 'none',
      content: (
        <div>
          <span>No serial ports found</span>
        </div>
      )
    })
  }

  console.log('app.selSerialPort=' + app.selSerialPort)
  return (
    <div id="settings-outer-container" style={{ backgroundColor: '#10101050', top: 0, bottom: 0, left: 0, right: 0, position: 'fixed', zIndex: 100, display: app.settingsShown === true ? 'flex' : 'none', justifyContent: 'center', alignItems: 'center' }}>
    <div id="settings-inner-container" style={{ width: '80%', height: '80%', backgroundColor: 'white', padding: '20px' }}>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h3>Settings</h3>
        <div className={styles.serialPortParamRow}>
          <span style={{ display: 'inline-block', width: parameterNameWidth }}>Serial Port: </span>
          <Dropdown
            selection
            options={serialPortInfoRows}
            value={app.selSerialPort}
            onChange={app.selSerialPortChanged}
            disabled={app.serialPortState !== 'Closed'}
            style={{ width: '600px' }} // Make this wide as it displays much serial port info
          />
        </div>
        <div style={{ height: '10px' }} />
        <div className={styles.serialPortParamRow}>
          <span style={{ display: 'inline-block', width: parameterNameWidth }} />
          <Button
            onClick={app.rescan}
            disabled={app.serialPortState !== 'Closed'}
          >Rescan</Button>
        </div>
        <div style={{ height: '10px' }} />

        {/* BAUD RATE */}
        <div className={styles.serialPortParamRow}>
          <span style={{ display: 'inline-block', width: parameterNameWidth }}>Baud rate: </span>
          <Dropdown
            selection
            placeholder="Select baud rate"
            options={baudRateOptions}
            value={app.selBaudRate}
            disabled={app.serialPortState !== 'Closed'}
            onChange={app.selBaudRateChanged}
          />
        </div>
        <div style={{ height: '10px' }} />

        {/* NUM. DATA BITS */}
        <div className={styles.serialPortParamRow}>
          <span style={{ display: 'inline-block', width: parameterNameWidth }}>Num. Data Bits:</span>
          <Dropdown
            selection
            options={numDataBitsAOptions}
            value={app.selNumDataBits}
            disabled={app.serialPortState !== 'Closed'}
            onChange={app.selNumDataBitsChanged}
          />
        </div>
        <div style={{ height: '10px' }} />

        {/* PARITY */}
        <div className={styles.serialPortParamRow}>
          <span style={{ display: 'inline-block', width: parameterNameWidth }}>Parity:</span>
          <Dropdown
            selection
            options={parityOptions}
            value={app.selParity}
            disabled={app.serialPortState !== 'Closed'}
            onChange={app.selParityChanged}
          />
        </div>
        <div style={{ height: '10px' }} />

        {/* NUM. STOP BITS */}
        <div className={styles.serialPortParamRow}>
          <span style={{ display: 'inline-block', width: parameterNameWidth }}>Num. Stop Bits:</span>
          <Dropdown
            selection
            options={numStopBitsAOptions}
            value={app.selNumStopBits}
            disabled={app.serialPortState !== 'Closed'}
            onChange={app.selNumStopBitsChanged}
          />
        </div>
        <div style={{ height: '10px' }} />

        {/* OPEN SERIAL PORT */}
        <Button onClick={app.openCloseButtonClicked} disabled={app.selSerialPort === 'none'} style={{ width: '200px' }}>
          { app.serialPortState === 'Closed' ? 'Open Port' : 'Close Port' }
        </Button>
        <div style={{ height: '30px' }} />

        <Button onClick={() => { app.setSettingsShown(false)}}>Close Settings</Button>
      </div>
    </div>
  </div>
  )
})

export default SettingsView
