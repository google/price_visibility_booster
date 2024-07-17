/*
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

const SPREADSHEET = SpreadsheetApp.getActive();
const ADS_DATA_SHEET = SPREADSHEET.getSheetByName('AdsData');
const MERCHANT_ID = SPREADSHEET.getRangeByName('merchantId').getValue();
const CUSTOM_LABEL_NUMBER =
    SPREADSHEET.getRangeByName('customLabelNumber').getValue();
const ACTIVATE_LABELS = SPREADSHEET.getRangeByName('activateLabels').getValue();
const COUNTRY_FILTER = SPREADSHEET.getRangeByName('countryFilter').getValue();
const CURRENCY_FILTER = SPREADSHEET.getRangeByName('currencyFilter').getValue();

let BELOW_BENCHMARK_RULE =
    spreadsheet.getRangeByName('rules.belowBenchmark').getValue();
if (BELOW_BENCHMARK_RULE > 0) {
  BELOW_BENCHMARK_RULE *= -1;
}
const BELOW_BENCHMARK_NAME =
    spreadsheet.getRangeByName('labelName.below').getValue();

let AT_BENCHMARK_RULE_RAW =
    spreadsheet.getRangeByName('rules.atBenchmark').getValue();
if (isNaN(AT_BENCHMARK_RULE_RAW)) {
  AT_BENCHMARK_RULE_RAW =
      Number(AT_BENCHMARK_RULE_RAW.replace('±', '').replace('%', ''));
  if (AT_BENCHMARK_RULE_RAW > 1 || AT_BENCHMARK_RULE_RAW < 1) {
    AT_BENCHMARK_RULE_RAW = AT_BENCHMARK_RULE_RAW / 100;
  }
}
if (AT_BENCHMARK_RULE_RAW < 0) {
  AT_BENCHMARK_RULE_RAW *= -1;
}
const AT_BENCHMARK_RULE = AT_BENCHMARK_RULE_RAW;
const AT_BENCHMARK_NAME = spreadsheet.getRangeByName('labelName.at').getValue();

const ABOVE_BENCHMARK_RULE =
    spreadsheet.getRangeByName('rules.aboveBenchmark').getValue();
const ABOVE_BENCHMARK_NAME =
    spreadsheet.getRangeByName('labelName.above').getValue();

const EXPORT_LABELS = [];
let labels = SPREADSHEET.getRangeByName('exportLabels').getValues();
labels.forEach(function(row, i) {
  if (row[0]) {
    EXPORT_LABELS.push(row[1]);
  }
});

const STOCK_ENABLED =
    SPREADSHEET.getRangeByName('stockInfo.enabled').getValue();
const STOCK_ATTRIBUTE =
    SPREADSHEET.getRangeByName('stockInfo.attribute').getValue();
const STOCK_THRESHOLD =
    SPREADSHEET.getRangeByName('stockInfo.threshold').getValue();

const RANGE_OUTPUT = SPREADSHEET.getRangeByName('updatedAt.output');
const RANGE_BENCHMARK = SPREADSHEET.getRangeByName('updatedAt.benchmark');

const MANAGER_CID =
    SPREADSHEET.getRangeByName('reporting.ManagerCID').getValue();
const ACCOUNT_CID =
    SPREADSHEET.getRangeByName('reporting.AccountCID').getValue();

const PROPERTY_NAMES = {
  DEVELOPER_TOKEN: 'DeveloperToken',
};

const PAGE_SIZE = 1000;
const BATCH_SIZE = 1000;

const HEADERS = [
  'date', 'productCustomAttribute1', 'clicks', 'impressions', 'cost', 'avgCpc',
  'conversions', 'conversionsValue', 'allConversions', 'allConversionsValue'
];
const FIRST_COLUMN = 'A';
const LAST_COLUMN = 'J';