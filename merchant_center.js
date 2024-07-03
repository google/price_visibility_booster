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
 * @class MerchantCenterAPI
 * @constructor
 * @param {string} token The OAuth token to be used to call the API
 */
function MerchantCenterAPI(token) {
  this.url = 'https://shoppingcontent.googleapis.com/content/v2.1/';
  this.token = token;

  /**
   * Makes a call to the Content API version 2.1
   * @param {string} service The service to be called
   * @param {string} method The method to be called
   * @param {string} payload The payload to be sent
   * @return {!object} The response from the API
   */
  this.call = function(service, method, payload) {
    if (payload == '') {
      const params = {
        method: method,
        contentType: 'application/json',
        headers: {Authorization: 'Bearer ' + this.token},
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(this.url + service, params);

      return JSON.parse(response.getContentText());
    } else {
      let params = {
        method: method,
        payload: JSON.stringify(payload),
        contentType: 'application/json',
        headers: {Authorization: 'Bearer ' + this.token},
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(this.url + service, params);

      return JSON.parse(response.getContentText());
    }
  };
}

/**
 * Lists products from the Merchant Center.
 * @function listProducts
 * @memberof MerchantCenterAPI
 * @param {string} mcId - The Merchant Center ID.
 * @param {number} maxResults - The maximum number of results to return.
 * @param {string} [nextPageToken] - Optional token for retrieving the next page
 *     of results.
 * @return {!object} - The parsed JSON response containing product data.
 */
MerchantCenterAPI.prototype.listProducts = function(
    mcId, maxResults, nextPageToken) {
  if (nextPageToken != null && nextPageToken != '') {
    return this.call(
        mcId + '/products?maxResults=' + maxResults +
            '&pageToken=' + nextPageToken,
        'get', '');
  } else {
    return this.call(mcId + '/products?maxResults=' + maxResults, 'get', '');
  }
};

/**
 * Fetches reports from the Merchant Center.
 * @function get_report
 * @memberof MerchantCenterAPI
 * @param {string} mcId - The Merchant Center ID.
 * @param {!object} entries - The report query parameters.
 * @return {!object} - The parsed JSON response containing the report data.
 */
MerchantCenterAPI.prototype.getReport = function(mcId, entries) {
  return this.call(mcId + '/reports/search', 'post', entries);
};

/**
 * Makes a batch request for product information.
 * @function custom_batch_get
 * @memberof MerchantCenterAPI
 * @param {!object} entries - The batch request entries.
 * @return {!object} - The parsed JSON response containing the batch results.
 */
MerchantCenterAPI.prototype.custom_batch_get = function(entries) {
  return this.call('products/batch', 'post', entries);
};