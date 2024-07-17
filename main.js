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

/**
 * Mainexpand_more function to run the visibility booster process.
 *
 * This function orchestrates the entire process, including:
 *  - Fetching price benchmarks.
 *  - Retrieving product data.
 *  - Merging and processing data.
 */
function runVisibilityBooster() {
  // Read configuration and create instances
  const merchantApi = new MerchantCenterAPI(ScriptApp.getOAuthToken());
  let [offerList, benchmarkData] = getPriceBenchmark(merchantApi);
  let stats = getStats(merchantApi, merchantId, offerList);
  let productData = getProducts(offerList, merchantApi, BATCH_SIZE);
  mergeData(benchmarkData, productData, stats);
}
/**
 * Installs a weekly trigger to run the visibility booster.
 *
 * This function checks if a weekly trigger already exists. If not, it creates a
 * new trigger to run `runVisibilityBooster` every Monday.
 */
function installWeeklyTrigger() {
  const hasWeeklyTrigger =
      ScriptApp.getProjectTriggers()
          .filter(function(trigger) {
            return trigger.getHandlerFunction() == 'runVisibilityBooster';
          })
          .length > 0;
  if (!hasWeeklyTrigger) {
    ScriptApp.newTrigger('runVisibilityBooster')
        .timeBased()
        .everyWeeks(1)
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .create();
    SPREADSHEET.toast('Created weekly task to update the data');
  }
  else {
    SPREADSHEET.toast('Weekly trigger already installed');
  }
}
/**
 * Retrieves performance statistics (impressions, clicks) for a list of offers.
 *
 * @param {!Object} api - The MerchantCenterAPI instance.
 * @param {string} merchantId - The merchant ID.
 * @param {!Array} offerList - An array of offer IDs.
 * @return {!Object} An object mapping offer IDs to their impressions and clicks.
 */
function getStats(api, merchantId, offerList) {
  let idList = [];
  if (offerList.length > 0) {
    offerList.forEach(function(row, i) {
      idList.push('\'' + row.split(':')[3] + '\'');
    });
    let uniqueList = [...new Set(idList)];
    let query =
        'SELECT segments.offer_id, metrics.impressions, metrics.clicks ' +
        'FROM MerchantPerformanceView ' +
        'WHERE segments.date DURING LAST_30_DAYS ' +
        'AND metrics.impressions > 0 ' +
        'AND segments.offer_id IN (' + uniqueList.join(',') + ') ' +
        'AND segments.customer_country_code = \'' + COUNTRY_FILTER + '\'';
    Logger.log('Getting performance data for account ' + merchantId);
    let stats = downloadReport(api, merchantId, query);
    let metrics = {};
    if (stats.length > 0) {
      stats.forEach(function(row, i) {
        metrics[row.segments.offerId] = {
          'impressions': row.metrics.impressions,
          'clicks': row.metrics.clicks
        };
      });
    }
    else {
      return null;
    }
    return metrics;
  }
  else {
    return null;
  }
}
/**
 * Retrieves product details for a list of products.
 *
 * @param {!Array} productList - An array of product IDs.
 * @param {!Object} api - The MerchantCenterAPI instance.
 * @param {number} batch_size - The number of products to fetch per batch.
 * @return {!Object} An object mapping product IDs to their stock and availability.
 */
function getProducts(productList, api, batch_size) {
  if (productList.length > 0) {
    let products = {};
    let entries = [];
    let responses = [];
    productList.forEach(function(row, i) {
      const batch_entry = {
        'batchId': i,
        'merchantId': merchantId,
        'method': 'get',
        'productId': row
      };
      entries.push(batch_entry);
      if ((i + 1) % batch_size == 0 || i == productList.length - 1) {
        let shoppingResponse = api.custom_batch_get({'entries': entries});
        if (shoppingResponse.error) {
          Log.output(
              'Error occurred on call: ' + JSON.stringify(shoppingResponse));
        }
        else {
          responses = responses.concat(shoppingResponse.entries);
        }
        entries =[];
        }
    });
    if (responses.length > 0) {
      responses.forEach(function(row, i) {
        let custom_attribute_value = '';
        if (STOCK_ENABLED) {
          try {
            if (row.product.customAttributes) {
              row.product.customAttributes.forEach(function(att, index) {
                if (att.name == STOCK_ATTRIBUTE) {
                  custom_attribute_value = att.value;
                }
              });
            }
          } catch (err) {
            Logger.log(err);
          }
        }
        products[row.product.id] = {
          'stockQuantity': custom_attribute_value,
          'availability': row.product.availability
        };
      });
    }
    return products;
  } else {
    throw new Error('No products returned from the price benchmark query');
  }
}
/**
 * Fetches a list of products from the Merchant Center API.
 *
 * This function retrieves products in batches using pagination, handling potential
 * errors and logging progress along the way.
 *
 * @param {!Object} api - An instance of the MerchantCenterAPI.
 * @param {string} merchantId - The ID of the merchant whose products to fetch.
 * @param {number} maxResults - The maximum number of products to retrieve per page.
 * @return {!Array} An array containing the fetched product resources.
 * @throws {Error} If an internal server error (code 500) occurs while fetching the report.
 */
function getProductList(api, merchantId, maxResults) {
  let pageToken = '';
  let fullResults = [];
  while (pageToken != null) {
    let response = api.list_products(merchantId, maxResults, pageToken);
    if (response.resources != null) {
      pageToken = response.nextPageToken;
      fullResults = fullResults.concat(response.resources);
    }
    else if (response.error != null) {
      Logger.log(
          'Error(' + response.error.code + '): ' + response.error.message);
      if (response.error.code == 500) {
        Logger.log('Got ' + fullResults.length + ' so far...');
        throw new Error(
            'Internal error when getting report. Please try it again');
      }
      break;
    }
    else {
      break;
    }
  }
  Logger.log('Final results: ' + fullResults.length + ' rows.');
  return fullResults;
}
/**
 * Downloads a report from the Merchant Center API using pagination and error handling.
 *
 * This function fetches a report in batches, handling potential API errors
 * and retrying in case of internal server errors (code 500) for a limited number of times.
 * It logs the final number of fetched rows upon completion.
 *
 * @param {!Object} api - The API instance used to make the report request.
 * @param {string} merchantId - The ID of the merchant whose report is being requested.
 * @param {string} query - The query string used to filter and retrieve specific report data.
 * @return {!Array}  An array containing the fetched report results.
 * @throws {Error} If an internal server error persists after retries or if another type of error occurs.
 */

function downloadReport(api, merchantId, query) {
  let pageToken = '';
  let fullResults = [];
  let nTries = 0;
  let maxTries = 3;
  while (pageToken != null) {
    let entries = {
      'query': query,
      'pageSize': PAGE_SIZE,
      'pageToken': pageToken
    };
    let response = api.getReport(merchantId, entries);
    if (response.results != null) {
      pageToken = response.nextPageToken;
      fullResults = fullResults.concat(response.results);
    }
    else if (response.error != null) {
      Logger.log(
          'Error(' + response.error.code + '): ' + response.error.message);
      if (response.error.code == 500) {
        if (nTries < maxTries) {
          Logger.log('Internal error. Trying again #' + (nTries + 1));
          nTries += 1;
          continue;
        }
        throw new Error(
            'Internal error getting report. Please try it again later');
      }
      break;
    }
    else {
      break;
    }
  }
  Logger.log('Final results: ' + fullResults.length + ' rows.');
  return fullResults;
}
/**
 * Flattens a nested object into a single-level object.
 *
 * This function recursively traverses an object, transforming nested properties into
 * a dot-separated path format. For example:
 *
 * ```javascript
 * const nested = { a: { b: 1, c: 2 }, d: 3 };
 * const flattened = flatten(nested);
 * // flattened: { 'a.b': 1, 'a.c': 2, 'd': 3 }
 * ```
 *
 * @param {!Object} src - The nested object to be flattened.
 * @return {!Object} A new object with flattened properties.
 */
function flatten(src) {
  /**
   * Recursive helper function to flatten nested object properties.
   *
   * This function traverses an object recursively, converting nested property names
   * into a dot-separated string representation. It's designed to be used internally
   * by the `flatten` function.
   *
   * @param {*} value - The current value being processed (could be an object, primitive, etc.).
   * @param {string} [field=''] - The current path (in dot notation) representing the nested structure.
   * @return {*} The flattened representation of the value.
   *   - If the value is an object, it returns a flattened object.
   *   - If the value is not an object or is an array, it returns the value itself or an object
   *     with the `field` as the key and the `value` as the value.
   */
  function flattenHelper(value, field) {
    field = field || '';
    if (typeof value === 'object' && !!value && !Array.isArray(value)) {
      return Object.assign(
          {},
          ...Object.keys(value).map(
              subField => flattenHelper(
                  value[subField],
                  field ? `${field}.${subField}` : `${subField}`)));
    } else {
      return field ? {[field]: value} : value;
    }
  }
  return flattenHelper(src);
}
/**
 * Calculates a custom label based on the relative price difference.
 *
 * This function categorizes a product's price relative to a benchmark price
 * and assigns a label based on predefined rules and thresholds.
 *
 * @param {number} relativePrice - The relative difference between a product's price and the benchmark price, calculated as (product_price / benchmark_price) - 1.
 * @return {string} The calculated label based on the relative price. Possible values are:
 *   - `BELOW_BENCHMARK_NAME` (if relativePrice is below the BELOW_BENCHMARK_RULE)
 *   - `AT_BENCHMARK_NAME`   (if relativePrice is within the AT_BENCHMARK_RULE range)
 *   - `ABOVE_BENCHMARK_NAME` (if relativePrice is above the ABOVE_BENCHMARK_RULE)
 *   - An empty string (`''`) if none of the above conditions are met.
 */
function calculateLabel(relativePrice) {
  if (relativePrice < BELOW_BENCHMARK_RULE) {
    return BELOW_BENCHMARK_NAME;
  } else if (
      relativePrice >= AT_BENCHMARK_RULE * (-1) &&
      relativePrice < AT_BENCHMARK_RULE) {
    return AT_BENCHMARK_NAME;
  } else if (relativePrice > ABOVE_BENCHMARK_RULE) {
    return ABOVE_BENCHMARK_NAME;
  } else {
    return '';
  }
}
/**
 * Retrieves price benchmark data from the Merchant Center API.
 *
 * This function fetches price competitiveness data for products, including their IDs,
 * titles, brands, prices, currencies, and benchmark prices. It filters the results
 * based on the `COUNTRY_FILTER` and `CURRENCY_FILTER` settings.
 *
 * @param {!Object} api - The API instance used to make the request.
 * @return {!Array} An array containing two elements:
 *   1. A unique list of product IDs (`uniqueList`).
 *   2. The full price benchmark data (`price_comp`) returned from the API.
 */
function getPriceBenchmark(api) {
  let query = 'SELECT product_view.id, product_view.offer_id, ' +
      'product_view.title, product_view.brand,  ' +
      'product_view.price_micros, product_view.currency_code, ' +
      'price_competitiveness.country_code, ' +
      'price_competitiveness.benchmark_price_micros, ' +
      'price_competitiveness.benchmark_price_currency_code ' +
      'FROM PriceCompetitivenessProductView ' +
      'WHERE price_competitiveness.country_code = \'' + COUNTRY_FILTER + '\' ' +
      'AND product_view.currency_code = \'' + CURRENCY_FILTER + '\' ' +
      'AND price_competitiveness.benchmark_price_currency_code = \'' +
      CURRENCY_FILTER + '\'';
  Logger.log('Getting Price Benchmark stats for account ' + merchantId);
  let priceComp = downloadReport(api, merchantId, query);
  let offerList = [];
  priceComp.forEach(function(row, i) {
    offerList.push(row.productView.id);
  });
  let uniqueList = [...new Set(offerList)];
  return [uniqueList, priceComp];
}
/**
 * Merges and processes benchmark, product, and statistics data.
 *
 * This function takes data from multiple sources and combines it to create
 * two output arrays:
 *
 * 1. `output`: A detailed report including product information, price comparison,
*    custom labels, and performance stats (impressions, clicks).
 * 2. `supplemental_feed`: A simplified feed containing only product IDs and their
 *    associated custom labels (if enabled).
 *
 * The function filters and transforms the data based on various conditions,
 * such as availability, stock levels, and price competitiveness. The results are
 * then pushed to the appropriate sheets in a spreadsheet.
 *
 * @param {!Array} benchmarkData - An array of objects containing price benchmark data.
 * @param {!Object} productData - An object mapping product IDs to their stock and availability information.
 * @param {!Object} statsData - An object mapping offer IDs to their impressions and clicks.
 * @global {boolean} STOCK_ENABLED - A global flag indicating if stock information should be included.
 * @global {boolean} ACTIVATE_LABELS - A global flag indicating if the supplemental feed should be created.
 * @global {string[]} EXPORT_LABELS - A global array of allowed custom labels for export.
 */
function mergeData(benchmarkData, productData, statsData) {
  let output = [];
  let supplemental_feed = [];
  if (STOCK_ENABLED) {
    output.push([
      'id', 'title', 'brand', 'current_price', 'currency', 'country',
      'benchmark_price', '% current vs. benchmark',
      ('custom_label_' + CUSTOM_LABEL_NUMBER), 'impressions', 'clicks',
      STOCK_ATTRIBUTE
    ]);
  }
  else {
    output.push([
      'id', 'title', 'brand', 'current_price', 'currency', 'country',
      'benchmark_price', '% current vs. benchmark',
      ('custom_label_' + CUSTOM_LABEL_NUMBER), 'impressions', 'clicks'
    ]);
  }
  supplemental_feed.push(['id', ('custom_label_' + CUSTOM_LABEL_NUMBER)]);
  if (benchmarkData.length > 0) {
    benchmarkData.forEach(function(row, i) {
      let flatRow = flatten(row);
      if (flatRow['priceCompetitiveness.benchmarkPriceMicros'] > 0 &&
          productData[flatRow['productView.id']]) {
        let relativePrice = flatRow['productView.priceMicros'] /
                flatRow['priceCompetitiveness.benchmarkPriceMicros'] -
            1;
        let custom_label = calculateLabel(relativePrice);
        if (EXPORT_LABELS.includes(custom_label) &&
            productData[flatRow['productView.id']].availability ==
                'in stock' &&
            checkStock(
                productData[flatRow['productView.id']].stockQuantity)) {
          let clicks = 0;
          let impressions = 0;
          let stock_quantity = '';
          if (statsData[flatRow['productView.offerId']]) {
            impressions =
                statsData[flatRow['productView.offerId']].impressions;
            clicks = statsData[flatRow['productView.offerId']].clicks;
          }
          if (productData[flatRow['productView.id']]) {
            stock_quantity =
                productData[flatRow['productView.id']].stockQuantity;
          }
          supplemental_feed.push(
              [flatRow['productView.offerId'], custom_label]);
          if (STOCK_ENABLED) {
            output.push([
              flatRow['productView.offerId'], flatRow['productView.title'],
              flatRow['productView.brand'],
              flatRow['productView.priceMicros'] / 1000000,
              flatRow['productView.currencyCode'],
              flatRow['priceCompetitiveness.countryCode'],
              flatRow['priceCompetitiveness.benchmarkPriceMicros'] / 1000000,
              relativePrice, custom_label, impressions, clicks, stock_quantity
            ]);
          }
          else {
            output.push([
              flatRow['productView.offerId'], flatRow['productView.title'],
              flatRow['productView.brand'],
              flatRow['productView.priceMicros'] / 1000000,
              flatRow['productView.currencyCode'],
              flatRow['priceCompetitiveness.countryCode'],
              flatRow['priceCompetitiveness.benchmarkPriceMicros'] / 1000000,
              relativePrice, custom_label, impressions, clicks
            ]);
          }
        }
      }
    });
    pushToSheets('benchmark data', output, RANGE_BENCHMARK);
    if (ACTIVATE_LABELS) {
      pushToSheets(
          'output - supplemental feed', supplemental_feed, RANGE_OUTPUT);
    }
  }
  else {
    Logger.log('No price benchmark data retrieved');
  }
}
/**
 * Clears a specified sheet and writes data to it, updating a timestamp.
 *
 * This function takes a 2D array of data, clears the specified sheet in the
 * spreadsheet, writes the data to the sheet starting from cell A1, and updates a
 * range that stores a timestamp indicating when the sheet was last updated.
 *
 * @param {string} sheetName - The name of the sheet to update.
 * @param {!Array} data - A 2D array containing the data to write to the sheet.
 * @param {!Range} updatedAtRange - The range where the timestamp of the last update should be recorded.
 * @global {Spreadsheet} SPREADSHEET - The global Spreadsheet object representing the current spreadsheet.
 */
function pushToSheets(sheetName, data, updatedAtRange) {
  let sheet = SPREADSHEET.getSheetByName(sheetName);
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  let currentTimeZone = Session.getScriptTimeZone();
  let updatedAt =
      Utilities.formatDate(new Date(), currentTimeZone, 'yyyy-MM-dd HH:mm:ss');
  updatedAtRange.setValue(updatedAt);
}
/**
 * Checks if a product is in stock based on stock information and a threshold.
 *
 * This function evaluates the provided stock information. If stock tracking is
 * disabled (`STOCK_ENABLED` is false), it always returns `true`. If stock
 * tracking is enabled, it compares the stock quantity to the
 * `STOCK_THRESHOLD` and returns `true` if the quantity meets or exceeds
 * the threshold, otherwise `false`.
 *
 * Note: The function handles cases where `stockInfo` is not a number or is
 * an empty string by treating it as zero.
 *
 * @param {number|string} stockInfo - The stock quantity of a product.
 * @global {boolean} STOCK_ENABLED - A global flag indicating if stock information should be considered.
 * @global {number} STOCK_THRESHOLD - A global value representing the minimum stock quantity for a product to be considered in stock.
 * @return {boolean} `true` if the product is considered in stock, `false` otherwise.
 */
function checkStock(stockInfo) {
  if (isNaN(stockInfo) || stockInfo == '') {
    stockInfo = 0;
  }
  if (!STOCK_ENABLED) {
    return true;
  }
  if (STOCK_ENABLED && stockInfo >= STOCK_THRESHOLD) {
    return true;
  }
  if (STOCK_ENABLED && stockInfo < STOCK_THRESHOLD) {
    return false;
  } else {
    return true;
  }
}