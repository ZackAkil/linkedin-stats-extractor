# LinkedIn Stats Extractor

A Chrome extension to extract and analyze your personal LinkedIn post statistics.

## Purpose

This tool is designed for content creators who want to easily track the performance of their own posts on LinkedIn. It opens as a side panel, automatically scrolls your activity feed to load all posts, and then extracts key metrics—impressions, likes, comments, and reposts—into a clean table. You can also copy all extracted data to your clipboard as a JSON object for further analysis.

## Installation

To install the extension locally, follow these steps:

1.  Clone or download this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" using the toggle switch in the top-right corner.
4.  Click the "Load unpacked" button that appears on the top-left.
5.  Select the directory where you cloned/downloaded this repository.
6.  The "LinkedIn Stats Extractor" extension should now appear in your list of extensions and be ready to use.

## Structure

- `manifest.json`: The extension's configuration file.
- `background.js`: The background service worker that manages the side panel.
- `sidepanel.html`: The HTML for the extension's side panel UI.
- `sidepanel.js`: The JavaScript that handles all UI logic and data scraping.
- `sidepanel.css`: The CSS for styling the side panel.
- `images/`: Contains the extension's icons.
