// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/uwValidationService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeSvc from 'js/localeService';
import dateTimeSvc from 'js/dateTimeService';
import uwDirectiveDateTimeSvc from 'js/uwDirectiveDateTimeService';
import ngModule from 'angular';
import _ from 'lodash';

/**
 * Integer minimum value, which is equal to Java Integer's minimum value
 */
var _integerMinValue = -2147483648;

/**
 * Integer maximum value, which is equal to Java Integer's maximum value
 */
var _integerMaxValue = 2147483647;

/**
 * Remove all characters from the given string that are not valid for a double value.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @private
 *
 * @param {String} clean - String to 'clean'.
 *
 * @returns {String} The given string value now cleaned of any non-numeric characters.
 */
var _parseDoubleCharacters = function( clean ) {
    var charArray = [ '.', '-', '+', 'e' ];

    var cleanRet = clean;

    for( var i = 0; i < charArray.length; i++ ) {
        var check = clean.split( charArray[ i ] );

        if( !ngModule.isUndefined( check[ 1 ] ) ) {
            cleanRet = check[ 0 ] + charArray[ i ] + check[ 1 ];
        }
    }

    return cleanRet;
};

/**
 * @private
 *
 * @param {Object} scope - scope
 * @param {Function} msgFn - Function to call that will set the error message
 */
var _setErrorText = function( scope, msgFn ) {
    scope.errorApi.errorMsg = '...details pending';
    var localTextBundle = localeSvc.getLoadedText();
    if( localTextBundle ) {
        msgFn( localTextBundle );
    } else {
        localeSvc.getTextPromise().then( msgFn( localTextBundle ) );
    }
};

var exports = {};

/**
 * Set error message to overlay object and calls back to gwt land to fire validation error event.
 *
 * @param {Object} scope - scope
 * @param {String} msg - error message
 */
export let setErrorMessage = function( scope, msg ) {
    var errorMsg = null;
    if( !scope.prop ) {
        return;
    }

    if( msg ) {
        errorMsg = msg;
    }

    /**
     * Check for custom validation error messages if there are any and concatenate them along with widget validation
     * error message.
     */
    if( scope.prop.validationCriteria && _.isArray( scope.prop.validationCriteria ) && ( scope.errorApi.showCustomError || scope.prop.dbValue ) ) {
        var customValidationErrorMsg = '';
        for( var inx in scope.prop.validationCriteria ) {
            if( scope.prop.validationCriteria[ inx ] ) {
                customValidationErrorMsg += scope.prop.validationCriteria[ inx ];
            }
        }

        if( customValidationErrorMsg ) {
            if( !errorMsg ) {
                errorMsg = customValidationErrorMsg;
            }
        }
    }

    /**
     * Don't clear error property if the server validation flag is true. Set client side error message only if
     * server validation flag is false OR when server validation flag is true and client side message is not
     * null/empty.
     * It also clears the custom error  on next validation cycle if the customError is coming blank.
     */
    if( scope.prop.hasServerValidationError && errorMsg || !scope.prop.hasServerValidationError ) {
        scope.errorApi.errorMsg = errorMsg;
        scope.prop.error = errorMsg;
        // callback to gwt land to fire validation error event
        if( scope.prop.propApi && scope.prop.propApi.fireUIValidationErrorEvent ) {
            scope.prop.propApi.fireUIValidationErrorEvent( scope.prop.error );
        }
        if( customValidationErrorMsg === '' ) {
            scope.errorApi.showCustomError = false;
        }
    }
};

/**
 * Process the value and checks whether it is a valid double value, if its not valid double then throw an error.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {NgModelController} ngModelCtrl - The (optional) NgModelController to interact with in case the UI needs
 *            to be updated.
 *
 * @param {String} value - String to test for validity.
 *
 * @returns {Number} Same as given input value with any invalid characters removed.
 */
export let checkDouble = function( scope, ngModelCtrl, value ) {
    var pattern = /[^\+|\-|0-9\.|e]/g;
    var clean = value;

    if( !scope.prop.hasLov ) {
        clean = value.replace( pattern, '' );
        clean = _parseDoubleCharacters( clean );
    }

    if( ngModelCtrl && value !== clean ) {
        ngModelCtrl.$setViewValue( clean );
        ngModelCtrl.$render();
    }

    // check if value is valid number, if not valid then throw error
    if( isFinite( clean ) ) {
        // nullify error and since it is a valid number convert it to number
        // watcher function will sync prop.error too, but the async function can happen after
        // gwt's setError function which reverts the errorMsg to the previous error.
        exports.setErrorMessage( scope, null );

        // convert it to number type only when value is not null or not empty
        if( clean !== null && clean !== '' ) {
            clean = Number( clean );
        } else if( ngModelCtrl ) {
            ngModelCtrl.$setPristine();
        }
    } else {
        _setErrorText( scope, function( localTextBundle ) {
            var msg = localTextBundle.INVALID_DOUBLE;
            msg = msg.replace( '{0}', clean );
            exports.setErrorMessage( scope, msg );
        } );
    }

    return clean;
};

/**
 * Process the value and checks whether it is a valid double value, if its not valid double then throw an error.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {NgModelController} ngModelCtrl - The (optional) NgModelController to interact with in case the UI needs
 *            to be updated.
 *
 * @param {String} value - String to test for validity.
 *
 * @returns {Number} Same as given input value with any invalid characters removed.
 */
export let checkAsyncDouble = function( scope, ngModelCtrl, value ) {
    return AwPromiseService.instance( function( resolve, reject ) {
        _setErrorText( scope, function( localTextBundle ) {
            var pattern = /[^\+|\-|0-9\.|e]/g;
            var clean = value;

            if( scope.prop && !scope.prop.hasLov ) {
                clean = value.replace( pattern, '' );
                clean = _parseDoubleCharacters( clean );
            }

            if( ngModelCtrl && value !== clean ) {
                ngModelCtrl.$setViewValue( clean );
                ngModelCtrl.$render();
            }

            // check if value is valid number, if not valid then throw error
            if( isFinite( clean ) ) {
                // nullify error and since it is a valid number convert it to number
                // watcher function will sync prop.error too, but the async function can happen after
                // gwt's setError function which reverts the errorMsg to the previous error.
                exports.setErrorMessage( scope, null );

                // convert it to number type only when value is not null or not empty
                if( clean !== null && clean !== '' ) {
                    clean = Number( clean );
                }

                resolve();
            } else {
                var invalidMsg = localTextBundle.INVALID_DOUBLE;
                invalidMsg = invalidMsg.replace( '{0}', clean );
                exports.setErrorMessage( scope, invalidMsg );

                reject();
            }
        } );
    } );
};

/**
 * Process the value and checks whether it is a valid integer value, if its not a valid integer then report an
 * error.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {NgModelController} ngModelCtrl - The (optional) NgModelController to interact with in case the UI needs
 *            to be updated.
 *
 * @param {String} value - String to test for validity.
 *
 * @returns {Number} Same as given input value with any invalid characters removed.
 */
export let checkAsyncInteger = function( scope, ngModelCtrl, value ) {
    return AwPromiseService.instance( function( resolve, reject ) {
        _setErrorText( scope, function( localTextBundle ) {
            var pattern = /[^\+|\-|0-9]/g;
            var clean = value;

            if( scope.prop && !scope.prop.hasLov ) {
                clean = value.replace( pattern, '' );
            }

            if( ngModelCtrl && value !== clean ) {
                ngModelCtrl.$setViewValue( clean );
                ngModelCtrl.$render();
            }

            // check if value is valid number, if not valid then throw error
            if( isFinite( clean ) ) {
                if( Number( clean ) < _integerMinValue || Number( clean ) > _integerMaxValue ) {
                    var msg = localTextBundle.INTEGER_OUT_OF_RANGE;

                    msg = msg.replace( '{0}', clean );
                    msg = msg.replace( '{1}', _integerMinValue.toString() );
                    msg = msg.replace( '{2}', _integerMaxValue.toString() );

                    exports.setErrorMessage( scope, msg );
                    reject();
                } else {
                    // nullify error and since it is a valid number convert it to number
                    // watcher function will sync prop.error too, but the async function can happen after
                    // gwt's setError function which reverts the errorMsg to the previous error.
                    exports.setErrorMessage( scope, null );

                    // convert it to number type only when value is not null or not empty
                    if( clean !== null && clean !== '' ) {
                        clean = Number( clean );
                    }

                    resolve();
                }
            } else {
                var invalidMsg = localTextBundle.INVALID_INTEGER;
                invalidMsg = invalidMsg.replace( '{0}', clean );

                exports.setErrorMessage( scope, invalidMsg );
                reject();
            }
        } );
    } );
};

/**
 * Process the value and checks whether it is a valid integer value, if its not a valid integer then report an
 * error.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {NgModelController} ngModelCtrl - The (optional) NgModelController to interact with in case the UI needs
 *            to be updated.
 *
 * @param {String} value - String to test for validity.
 *
 * @returns {Number} Same as given input value with any invalid characters removed.
 */
export let checkInteger = function( scope, ngModelCtrl, value ) {
    var pattern = /[^\+|\-|0-9]/g;
    var clean = value;

    if( !scope.prop.hasLov ) {
        clean = value.replace( pattern, '' );
    }

    if( ngModelCtrl && value !== clean ) {
        ngModelCtrl.$setViewValue( clean );
        ngModelCtrl.$render();
    }

    // check if value is valid number, if not valid then throw error
    if( isFinite( clean ) ) {
        if( Number( clean ) < _integerMinValue || Number( clean ) > _integerMaxValue ) {
            _setErrorText( scope, function( localTextBundle ) {
                var msg = localTextBundle.INTEGER_OUT_OF_RANGE;

                msg = msg.replace( '{0}', clean );
                msg = msg.replace( '{1}', _integerMinValue.toString() );
                msg = msg.replace( '{2}', _integerMaxValue.toString() );

                exports.setErrorMessage( scope, msg );
            } );
        } else {
            // nullify error and since it is a valid number convert it to number
            // watcher function will sync prop.error too, but the async function can happen after
            // gwt's setError function which reverts the errorMsg to the previous error.
            exports.setErrorMessage( scope, null );

            // convert it to number type only when value is not null or not empty
            if( clean !== null && clean !== '' ) {
                clean = Number( clean );
            }
        }
    } else {
        _setErrorText( scope, function( localTextBundle ) {
            var msg = localTextBundle.INVALID_INTEGER;
            msg = msg.replace( '{0}', clean );

            exports.setErrorMessage( scope, msg );
        } );
    }

    return clean;
};

/**
 * Checks whether the value is empty, if it's empty then throw an error.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {NgModelController} ngModelCtrl - The (optional) NgModelController to interact with in case the UI needs
 *            to be updated.
 *
 * @param {String} value - String to test for validity.
 *
 * @returns {Promise} the promise object
 */
export let checkRequired = function( scope, ngModelCtrl, value ) {
    var valid = true;
    var prop = scope.prop;
    if( prop && prop.isRequired ) {
        if( !value && prop.type !== 'BOOLEAN' || value && prop.inputType === 'text' && value.length === 0 ) {
            valid = false;
        } else if( prop.type === 'DATE' || prop.type === 'DATEARRAY' ) {
            valid = !dateTimeSvc.isNullDate( value );
        } else if( prop.type === 'BOOLEAN' ) {
            if( value === null || value === undefined ) {
                valid = false;
            }
        }
    }

    if( !valid && ngModelCtrl.$dirty ) {
        _setErrorText( scope, function( localTextBundle ) {
            exports.setErrorMessage( scope, localTextBundle.PROP_REQUIRED_ERROR );
        } );
    } else {
        exports.setErrorMessage( scope, null );
    }

    return valid;
};

/**
 * Process the value and checks whether it can be successfully converted into a date, if its not a valid date then
 * report an error. Note: If there is any failure in validation, the details of which will appear as a non-null
 * value on the 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {String} dateValue - String value to test.
 *
 * @param {Boolean} initErrorMsg - TRUE if the 'scope.errorApi.errorMsg' should be set to NULL before the check.
 *
 * @returns {String} The given string value.
 */
export let checkDate = function( scope, dateValue, initErrorMsg ) {
    var valid = true;
    if( initErrorMsg && !scope.errorApi.errorMsg ) {
        scope.errorApi.errorMsg = null;
    }

    if( dateValue ) {
        try {
            uwDirectiveDateTimeSvc.parseDate( dateValue );

            scope.errorApi.errorMsg = null; // It's a valid date, clear the error message
            exports.setErrorMessage( scope, null );
        } catch ( ex ) {
            valid = false;

            _setErrorText( scope, function( localTextBundle ) {
                var msg = localTextBundle.INVALID_DATE;

                msg = msg.replace( '{0}', dateTimeSvc.getDateFormatPlaceholder() );

                scope.errorApi.errorMsg = msg;
                exports.setErrorMessage( scope, msg );
            } );
        }
    }

    return valid;
};

/**
 * Process the value and checks whether it can be successfully converted into a date, if its not a valid date then
 * report an error.
 * <P>
 * Note: This method will 1st clear any existing value in the 'scope.errorApi.errorMsg' property.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {Date} dateObject - JS Date object to test.
 *
 * @returns {Date} The given dateObject.
 */
export let checkDateTime = function( scope, dateObject ) {
    scope.errorApi.errorMsg = null;

    if( dateObject ) {
        var dateValue = uwDirectiveDateTimeSvc.formatDate( dateObject );

        exports.checkDate( scope, dateValue, false );

        if( !scope.errorApi.errorMsg ) {
            var timeValue = dateTimeSvc.formatTime( dateObject );

            exports.checkTime( scope, timeValue, false );
        }
    }

    return dateObject;
};

/**
 * Process the value and checks whether it can be successfully converted into a date, if its not a valid date then
 * report an error.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {String} dateValue - Date string value to test.
 *
 * @param {String} timeValue - Time string value to test.
 */
export let checkDateTimeValue = function( scope, dateValue, timeValue ) {
    scope.errorApi.errorMsg = null;

    exports.checkDate( scope, dateValue, false );

    if( !scope.errorApi.errorMsg ) {
        exports.checkTime( scope, timeValue, false );
    }
};

/**
 * Process the value and checks whether it can be successfully converted into a time, if its not a valid time then
 * report an error. Note: If there is any failure in validation, the details of which will appear as a non-null
 * value on the 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {String} timeValue - String value to test.
 *
 * @param {Boolean} initErrorMsg - TRUE if the 'scope.errorApi.errorMsg' should be set to NULL before the check.
 *
 * @returns {String} The given string timeValue.
 */
export let checkTime = function( scope, timeValue, initErrorMsg ) {
    var valid = true;
    if( initErrorMsg && !scope.errorApi.errorMsg ) {
        scope.errorApi.errorMsg = null;
        exports.setErrorMessage( scope, null );
    }

    if( timeValue ) {
        /**
         * Remove any trailing ':' before trying to match the pattern
         */
        var timeValueLcl = timeValue;

        if( timeValueLcl.length > 0 && timeValueLcl.charAt( timeValueLcl.length - 1 ) === ':' ) {
            timeValueLcl = timeValueLcl.substring( 0, timeValueLcl.length - 1 );
        }

        /**
         * Attempt to convert this string into a JS Date object.
         */
        var timeObject = dateTimeSvc.getDateFromTimeValue( timeValueLcl );

        if( timeObject ) {
            scope.errorApi.errorMsg = null; // It's a valid date, clear the error message
            exports.setErrorMessage( scope, null );
        } else {
            valid = false;

            _setErrorText( scope, function( localTextBundle ) {
                var msg = localTextBundle.INVALID_TIME;

                msg = msg.replace( '{0}', dateTimeSvc.getTimeFormatPlaceholder() );

                scope.errorApi.errorMsg = msg;
                exports.setErrorMessage( scope, msg );
            } );
        }
    }

    return valid;
};

exports = {
    setErrorMessage,
    checkDouble,
    checkAsyncDouble,
    checkAsyncInteger,
    checkInteger,
    checkRequired,
    checkDate,
    checkDateTime,
    checkDateTimeValue,
    checkTime
};
export default exports;
/**
 * @memberof NgServices
 * @member uwValidationService
 */
app.factory( 'uwValidationService', () => exports );
