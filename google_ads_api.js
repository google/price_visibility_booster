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
 * Class encapsulating access to the Google Ads API.
 */
class GoogleAdsApi {
  /**
   * Initialises the object with the parameters required in every call to the
   * Google Ads API.
   *
   * @param {string} developerToken
   * @param {string} managerCustomerId
   */
  constructor(developerToken, managerCustomerId) {
    this.developerToken = developerToken;
    this.managerCustomerId = managerCustomerId;
    this.commonOptions = {
      'contentType': 'application/json',
      'muteHttpExceptions': true,
      'headers': {
        'developer-token': developerToken,
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
        'login-customer-id': managerCustomerId,
      }
    };
    this.basePath = 'https://googleads.googleapis.com/v14/customers/';
  }

  /**
   * Checks and parses the content of an API response.
   *
   * @param {HTTPResponse!} httpResponse
   * @return {Object!}
   */
  getResultFrom(httpResponse) {
    if (httpResponse.toString().startsWith('<!DOCTYPE html>')) {
      return {};
    } else {
      return JSON.parse(httpResponse.getContentText('UTF-8'));
    }
  }

  /**
   * Sends a POST request to the API.
   *
   * @param {string} customerId
   * @param {string} path
   * @param {Object!} options
   * @return {Object!}
   */
  post(customerId, path, options) {
    const request = this.commonOptions;
    request.method = 'post';
    request.payload = JSON.stringify(options);
    return this.getResultFrom(
        UrlFetchApp.fetch(this.basePath + customerId + path, request));
  };

  /**
   * Executes the given query on the API.
   *
   * @param {string} query
   * @param {string} customerId
   * @param {boolean} countOnly - whether to only count records, not output data
   * @return {Object!}
   */
  executeSearch(query, customerId, countOnly) {
    let resultRecords = [];
    const options = {
      'query': query,
      'pageSize': 10000,
      'returnTotalResultsCount': true
    };
    let resultCount;
    do {
      const result = this.post(customerId, '/googleAds:search', options);
      if (result.error !== undefined) {
        throw new Error(JSON.stringify(result.error));
      } else if (result.results === undefined) {
        result.results = [];
      }
      resultCount = result.totalResultsCount;
      resultRecords = resultRecords.concat(result.results);
      if (countOnly || result.nextPageToken === undefined) {
        return {count: resultCount, records: resultRecords};
      } else {
        options.pageToken = result.nextPageToken;
      }
    } while (true);
  }
}