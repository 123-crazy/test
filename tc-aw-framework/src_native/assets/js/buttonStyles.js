// Copyright (c) 2020 Siemens
/**
 * Define the common styles shared for button and chip
 * @module "js/buttonStyles"
 */

// Define the map from button type to CSS class
const buttonStyles = {
    base: 'aw-base-button',
    accent: 'aw-base-button', //only applicable for selection chip
    caution: 'aw-caution',
    sole: 'aw-accent-caution',
    positive: 'aw-positive',
    negative: 'aw-negative-button',
    chromeless: 'aw-chromeless-button',
    'accent-high-contrast': 'aw-accent-highContrast',
    'accent-mid-contrast': 'aw-accent-midContrast',
    'accent-positive': 'aw-accent-positive',
    'accent-caution': 'aw-accent-caution',
    'accent-negative': 'aw-accent-negative',
    'accent-marketing': 'aw-accent-caution'
};

/**
 * Get button style, if button type is undefined or not supported, return the style of default type.
 * @param {String} buttonType the button type
 * @param {String} defaultType the default button type.
 * @returns {String} button CSS class
 */
export let getButtonStyle = function( buttonType, defaultType ) {
    // the default button style is accent high contrast
    if( !buttonType ) {
        buttonType = defaultType;
    }

    var btnClass = buttonStyles.base;
    if( buttonType && buttonStyles.hasOwnProperty( buttonType ) ) {
        btnClass = buttonStyles[ buttonType ];
    }

    return btnClass;
};

export default { getButtonStyle };
