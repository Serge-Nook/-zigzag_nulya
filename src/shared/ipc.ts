// IPC channel names shared between main and preload.
export const IPC = {
  // project files
  projectOpen: 'project:open',
  projectSave: 'project:save',
  projectSaveAs: 'project:saveAs',
  // exports
  exportPng: 'export:png',
  exportSvg: 'export:svg',
  exportPdf: 'export:pdf',
  // settings
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsPickAlarm: 'settings:pickAlarm',
  readAlarmData: 'settings:readAlarm',
  // network
  netScan: 'net:scan',
  netScanProgress: 'net:scanProgress',
  netPing: 'net:ping',
  netSnmpGet: 'net:snmpGet',
  netSnmpWalk: 'net:snmpWalk',
  netTraceroute: 'net:traceroute',
  netLldp: 'net:lldp',
  // snmp traps
  trapStart: 'trap:start',
  trapStop: 'trap:stop',
  trapReceived: 'trap:received',
  // shell
  openExternal: 'shell:openExternal',
  // inventory
  invStats: 'inv:stats',
  invListHardware: 'inv:listHardware',
  invUpsertHardware: 'inv:upsertHardware',
  invDeleteHardware: 'inv:deleteHardware',
  invListSoftware: 'inv:listSoftware',
  invUpsertSoftware: 'inv:upsertSoftware',
  invDeleteSoftware: 'inv:deleteSoftware',
  invListConfigHistory: 'inv:listConfigHistory',
  invAddConfigChange: 'inv:addConfigChange',
  invUpgradePlan: 'inv:upgradePlan',
  invExportCsv: 'inv:exportCsv'
} as const
