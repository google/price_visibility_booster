/**
    Copyright 2024 Google LLC
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        https://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

/**
 * This function converts the processed data into a 2D array.
 * @param {!Object} finalData The processed data.
 * @return {!Array} A 2D array of data.
 */
function rowAsArray(finalData) {
  const headers = HEADERS;
  let dataArray = [];
  dataArray.push(headers);
  for (date in finalData) {
    for (label in finalData[date]) {
      let row = [];
      for (field in headers) {
        row.push(finalData[date][label][headers[field]]);
      }
      if (row.length > 0) {
        dataArray.push(row);
      }
    }
  }
  return dataArray;
}

/**
 * This function creates a placeholder object for processed data.
 * @return {!Object} A placeholder object.
 */
function createRow() {
  let dataPlaceholder = {};
  const headers = HEADERS;
  for (header in headers) {
    dataPlaceholder[headers[header]] = 0;
  }
  return dataPlaceholder;
}

/**
 * This function gets ads data from Google Ads API.
 * @return {!Object} A 2D array of data.
 */
function getAdsData() {
  const DEVELOPER_TOKEN =
      PropertiesService.getScriptProperties().getProperty('DeveloperToken');
  const managerAccountId = MANAGER_CID.replaceAll('-', '');
  const customerId = ACCOUNT_CID.replaceAll('-', '');
  const googleAdsApi = new GoogleAdsApi(DEVELOPER_TOKEN, managerAccountId);

  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);
  let lastDay = currentDate.toJSON().slice(0, 10);
  let firstDate = new Date();
  firstDate.setDate(currentDate.getDate() - 90);
  let firstDay = firstDate.toJSON().slice(0, 10);

  let queryResult;
  let query = `
    SELECT
      segments.date,
      segments.product_custom_attribute1,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.average_cpc,
      metrics.ctr,
      metrics.conversions,
      metrics.conversions_value,
      metrics.all_conversions,
      metrics.all_conversions_value,
      metrics.conversions_from_interactions_rate
    FROM
      shopping_performance_view
    WHERE
      segments.date >= '` +
      firstDay + `'
      AND segments.date <= '` +
      lastDay + `'
      AND segments.product_custom_attribute1 IS NOT NULL
    `;
  try {
    queryResult = googleAdsApi.executeSearch(query, customerId, false);
  } catch (e) {
    console.log(e);
    return e;
  }
  return queryResult;
}

/**
 * This function processes the data from Google Ads API.
 * @param {!Object} data The data from Google Ads API.
 * @return {!Object} A 2D array of data.
 */
function processData(data) {
  let finalData = {};
  const flatObjects2 = data.records.map(deepObject => flatten(deepObject));
  for (item in flatObjects2) {
    row = flatObjects2[item];
    let processedRow = createRow();
    let date = row['segments.date'];
    if (row['segments.productCustomAttribute1']) {
      let label = row['segments.productCustomAttribute1'];
      if (!finalData[date]) {
        finalData[date] = {};
      }

      finalData[date][label] = processedRow;
      finalData[date][label]['date'] = date;

      finalData[date][label]['productCustomAttribute1'] =
          row['segments.productCustomAttribute1'];
      finalData[date][label]['conversions'] = row['metrics.conversions'];
      finalData[date][label]['allConversions'] = row['metrics.allConversions'];
      finalData[date][label]['allConversionsValue'] =
          row['metrics.allConversionsValue'];

      if (row['metrics.conversionsFromInteractionsRate']) {
        finalData[date][label]['conversionsRate'] =
            row['metrics.conversionsFromInteractionsRate'];
      }

      finalData[date][label]['conversionsValue'] =
          row['metrics.conversionsValue'];
      finalData[date][label]['cost'] = row['metrics.costMicros'] / 1e6;
      if (row['metrics.averageCpc']) {
        finalData[date][label]['avgCpc'] = row['metrics.averageCpc'] / 1e6;
      }
      finalData[date][label]['clicks'] = row['metrics.clicks'];
      finalData[date][label]['impressions'] = row['metrics.impressions'];
      finalData[date][label]['ctr'] = row['metrics.ctr'];
    }
  }
  return finalData;
}

/**
 * This function pushes the processed data to a spreadsheet.
 * @param {!Object} data The processed data.
 * @return {!Object} A 2D array of data.
 */
function pushToSpreadsheet(data) {
  const sheet = ADS_DATA_SHEET;
  const firstColumn = FIRST_COLUMN;
  const lastColumn = LAST_COLUMN;
  const sheetRange = firstColumn + ':' + lastColumn;
  sheet.getRange(sheetRange).clearContent();

  const start_row = 1;
  const endRow = data.length;
  const dataRange = firstColumn + start_row + ':' + lastColumn + endRow;
  if (data.length > 0) {
    sheet.getRange(dataRange).setValues(data);
  }
  return;
}

/**
 * This function runs the report.
 * @return {!Object} A 2D array of data.
 */
function runReport() {
  let results = getAdsData();
  let processedData = processData(results);
  let dataMatrix = rowAsArray(processedData);
  pushToSpreadsheet(dataMatrix);
}