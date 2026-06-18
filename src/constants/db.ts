export const DB_COLS = {
  // Common Asset / FAM Columns
  FA_DOC_NO: '"FA Doc#"',
  ASSET_NAME: '"Asset Name"',
  ASSET_NUMBER: '"Asset Number"',
  SERIAL_NO: '"Serial#"',
  QR_CODE: '"QR Code"',
  MACHINE_TYPE: '"Machine Type"',
  MACHINE_MODEL: '"Machine Model"',
  CURRENT_LOCATION: '"Current Location"',
  CUSTOMER_NAME: '"Current Customer Name"',
  CUSTOMER_CODE: '"C.Code"',
  BUILDING_NAME: '"Current Bldg Name"',
  CONTRACT_TYPE: '"Contr. Type"',
  CONTRACT_NO: '"Contract#"',
  COST_AMOUNT: '"Cost Amount"',
  FA_CODE_NAVISION: '"FA Code(From Navision)"',
  CREATED_TS: '"Created TS"',

  // Order / Task specific
  DOC_NUM: '"doc#"',
  JOB_NUM: '"job#"',
  ASSIGNED_DATE: '"ASSIGNED DATE TIME"',
  LOCATION_FLOOR: '"LOCATION(Floor)"',
  
  // Contract / Agreement specific
  CONTRACT_NUM: '"Contract#"',
  CUSTOMER_CODE_ALT: '"Customer Code"',
  CUST_CODE: '"cust_code"',
  CUST_NO: '"cust_no"',
  SERVICE_TYPE: '"Service Type"',
  AGREEMENT_TYPE: '"Agreement Type"'
} as const;
