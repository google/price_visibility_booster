<!--
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
-->

# Price Visibility Booster

**Make your competitive prices notable**

**Disclaimer: This is not an official Google product.**

## Overview

The Price Visibility Booster is a solution that helps you highlight your
competitive prices by leveraging price benchmark data from Google Merchant
Center. It uses the Content API to identify offers that are Below, At, or Above
the benchmark price and labels your products accordingly.

Optionally, you can also retrieve reporting data for the labels created, to
evaluate how well your selected products are doing.

## Main Functionality

-   Retrieves Price Benchmark information from Merchant Center using the Content
    API.
-   Identifies offers that are Below, At, or Above the benchmark price.
-   Labels your products based on their price position relative to the
    benchmark.

## Prerequisites

### For Price Benchmark (Required)

-   A functioning Merchant Center account
-   Market Insights enabled on the account
-   Standard (or Admin) access to Merchant Center
-   Reporting manager access to Merchant Center

### For Add-on Report (Optional)

-   Developer Token for the Google Ads API
-   Cloud project with Google Ads API enabled
-   Personal access to the Google Ads account where the campaigns are running

## Instructions

1.  Make a copy of this
    [Google Sheet](https://docs.google.com/spreadsheets/d/1MG1PqvoeibCPVvqL4BkMw1bl65PkrTauijU4-4S5ib0/edit?gid=890056473#gid=890056473)
    file and work on your newly created copy.

2.  Go to the 'start here' tab in the spreadsheet and follow the steps
    outlined there.

3.  Set up the necessary parameters:

    -   Merchant ID
    -   Custom label number
    -   Country and Currency filters
    -   Label thresholds for Below, At, and Above benchmark prices
    -   Stock information settings (if applicable)

4.  If using the optional Add-on report:

    -   Open Apps Script (Extensions > Apps Script in the Google Sheets menu)
    -   Go to Project Settings
    -   Change the GCP Project Number to your project
    -   Enable the Google Ads API in your Cloud Project
    -   Add a new Script Property named "DeveloperToken" with your Developer
        Token as the value
    -   In the 'control panel' tab, add your Manager and Account CIDs

## How It Works

1.  The solution retrieves price benchmark data from your Merchant Center
    account.
2.  It compares your product prices to the benchmark prices.
3.  Based on the configured thresholds, it assigns labels to your products:
    -   "Below benchmark"
    -   "At benchmark"
    -   "Above benchmark"
4.  These labels are then pushed to your Merchant Center feed (if enabled).
5.  Optionally, it can generate a report on how your labeled products are
    performing using the Google Ads API.

## Configuration

You can configure various aspects of the tool in the 'control panel' tab:

-   Label thresholds
-   Whether to activate labels
-   Stock information usage
-   And more

Refer to the spreadsheet for detailed configuration options and their
explanations.

## Support

If you encounter any issues or have questions, please refer to the documentation
provided in the Google Sheets file or contact your Google representative for
assistance.
