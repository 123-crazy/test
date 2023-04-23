// Copyright (c) 2020 Siemens

/**
 * @module js/aw.property.lov.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/uwLovDataService';
import 'js/dateTimeService';
import 'js/uwPropertyService';
import 'js/uwListService';
import 'js/uwValidationService';
import 'js/uwUtilService';
import 'js/uwDirectiveDateTimeService';
import 'js/localeService';
import 'js/popupService';
import wcagSvc from 'js/wcagService';

/**
 * Using controller for prop update currently, but consider passing an update f(x) from the parent controller using &
 *
 * @memberof NgControllers
 * @member awPropertyLovController
 *
 * @param {Object} $scope - The AngularJS data context node this controller is being created on.
 * @param {Element} $element - The DOM Element that contains this aw-checkbox-list.
 * @param {Object} $q - The queuing service to use.
 * @param {Object} $filter - filter
 * @param {uwLovDataService} uwLovDataSvc - required service
 * @param {dateTimeService} dateTimeSvc - required service
 * @param {uwPropertyService} uwPropertySvc - required service
 * @param {uwListService} uwListSvc - required service
 * @param {uwValidationService} uwValidationSvc - required service
 * @param {uwUtilService} uwUtilSvc - required service
 * @param {uwDirectiveDateTimeService} uwDirectiveDateTimeSvc - required service
 */
app.controller( 'awPropertyLovController', [
    '$scope',
    '$element',
    '$q',
    '$filter',
    'uwLovDataService',
    'dateTimeService',
    'uwPropertyService',
    'uwListService',
    'uwValidationService',
    'uwUtilService',
    'uwDirectiveDateTimeService',
    'localeService',
    function( $scope, $element, $q, $filter, uwLovDataSvc, dateTimeSvc, uwPropertySvc, uwListSvc, uwValidationSvc,
        uwUtilSvc, uwDirectiveDateTimeSvc, localeService ) {
        var uiProperty = $scope.prop;
        var isUserManuallyTyped = false;

        uiProperty.uiOriginalValue = uiProperty.uiValue;
        uiProperty.dbOriginalValue = uiProperty.dbValue;

        uiProperty.selectedLovEntries = [];

        $scope.lovEntries = [];
        $scope.expanded = false;
        $scope.moreValuesExist = true;
        $scope.lovInitialized = false;

        var validateLovOnBlur = false;

        /**
         * TRUE if we are NOT waiting for any values to be returned by the server.
         *
         * @memberof NgControllers.awPropertyLovController
         * @private
         */
        $scope.queueIdle = true;

        $scope.dropPosition = 'below';

        var idleTimer = null;

        $scope.myCtrl = this;
        $scope.myCtrl.$parent = $element;
        $scope.dropDownVerticalAdj = 0;
        $scope.listFilterText = '';

        var arrayValueRemovedSubscriber = eventBus.subscribe( $scope.prop.propertyName + '.arrayValueRemoved',
            function( context ) {
                if( uiProperty.isArray && ( !uiProperty.error || uiProperty.hasServerValidationError ) ) {
                    // remove the value, then validate
                    for( var inx = 0; inx < uiProperty.selectedLovEntries.length; inx++ ) {
                        if( uiProperty.selectedLovEntries[ inx ] === context.dbValue ) {
                            uiProperty.selectedLovEntries.splice( inx, 1 );
                            break;
                        }
                    }
                    //remove multiple values
                    if( context.removeValues ) {
                        _.forEach( context.removeValues, function( value ) {
                            for( var inx = 0; inx < uiProperty.selectedLovEntries.length; inx++ ) {
                                if( uiProperty.selectedLovEntries[ inx ].propInternalValue === value ) {
                                    uiProperty.selectedLovEntries.splice( inx, 1 );
                                }
                            }
                        } );
                    }
                    $scope.validateLOVValueSelections( uiProperty, uiProperty.selectedLovEntries );
                }
            } );

        var popupElem = null;
        var popupParentElem = null;

        var closeHandler = function() {
            //add back popup element to original parent
            if( popupParentElem && popupElem ) {
                popupParentElem.append( popupElem );
            }

            var body = ngModule.element( document.body );
            body.off( 'click touchstart dragstart', $scope, closeHandler );
        };

        /**
         * Toggle the expand/collapse state of the lov list.
         * <P>
         * Note: Called by (aw-property-lov-val) directive template to delegate an 'ng-click' on the text box
         * itself.
         *
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.toggleDropdown = function() {
            var choiceElem = $element.find( '.aw-jswidgets-choice' );
            if( $scope.expanded ) {
                uwListSvc.collapseList( $scope );
            } else {
                uwListSvc.expandList( $scope, $element );
            }
            // only when filtering is enabled
            if( $scope.prop && !$scope.prop.isSelectOnly ) {
                // select the text when entering the field
                choiceElem.select();
            }
            // Necessary for IOS to allow toggling after intial opening.
            choiceElem.off( 'touchstart' );
            choiceElem.on( 'touchstart', function( e ) {
                $scope.toggleDropdown( e );
            } );
        };

        /**
         * Handle enter key press on lov's element
         *
         * @param {Event} $event - event object
         */
        $scope.handleKeyPress = function( $event ) {
            if ( wcagSvc.isValidKeyPress( $event, true ) ) {
                $scope.toggleDropdown();
            }
        };

        /**
         * Bound via 'ng-change' on the 'input' element and called on input change - filter typing
         *
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.changeFunction = function() {
            isUserManuallyTyped = true;
            uiProperty = $scope.prop;
            /**
             * Before setting the dbValue, maybe we should look for a 'propDisplayValue' match in the lovEntries and
             * use that internal value. Probably not just for Date though...
             */
            if( uiProperty.type === 'DATE' || uiProperty.type === 'DATEARRAY' ) {
                for( var ndx = 0; ndx < $scope.lovEntries.length; ndx++ ) {
                    if( $scope.lovEntries[ ndx ].propDisplayValue === uiProperty.uiValue ) {
                        uiProperty.dbValue = $scope.lovEntries[ ndx ].propInternalValue;
                        break;
                    }
                }
            } else if( uiProperty.type === 'OBJECT' || uiProperty.type === 'OBJECTARRAY' ) {
                // we can't set the dbValue for an object based on filter text, but we can check to see if the
                // input
                // has been cleared
                if( !uiProperty.uiValue ) {
                    uiProperty.dbValue = '';
                }
            } else {
                uiProperty.dbValue = uiProperty.uiValue;
            }

            if( !uiProperty.isArray ) {
                uiProperty.uiValues = [ uiProperty.uiValue ];
                uiProperty.dbValues = [ uiProperty.dbValue ];
            }

            $scope.listFilterText = uiProperty.uiValue;

            // request the results and open the drop-down
            $scope.requestFilteredLovEntries();
            uwListSvc.expandList( $scope, $element );
        };

        /**
         * Evaluate a key press in the input
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {Object} event - Keyboard event to evaluate.
         */
        $scope.evalKey = function( event ) {
            uwListSvc.evalKey( $scope, event, $element );
            validateLovOnBlur = true;
        };

        /**
         * Called by the 'uwListService' when user escapes out of an LOV choice field. Actions is to revert value.
         *
         *
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.handleFieldEscape = function() {
            var uiProperty = $scope.prop;

            uiProperty.dbValue = uiProperty.dbOriginalValue;
            uiProperty.uiValue = uiProperty.uiOriginalValue;
        };

        /**
         * Retrieves lov entry based off filter text.
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @returns {LOVEntry} lov entry object created based off the filter text.
         */
        $scope.retrieveLovEntryWithFilterText = function() {
            var chosenLovEntry = null;
            var uiProperty = $scope.prop;
            if( uiProperty ) {
                if( uiProperty.type === 'DATE' || uiProperty.type === 'DATEARRAY' ) {
                    var dbValue = '';
                    if( typeof uiProperty.uiValue === 'string' ) {
                        var dateTime = uiProperty.uiValue.split( ' ' );
                        uwValidationSvc.checkDateTimeValue( $scope, dateTime[ 0 ], dateTime[ 1 ] );
                        if( $scope.errorApi.errorMsg ) {
                            dbValue = uiProperty.uiValue;
                        } else {
                            var dateValue = uwDirectiveDateTimeSvc.parseDate( dateTime[ 0 ] );
                            if( dateTime[ 1 ] ) {
                                var timeValue = dateTimeSvc.getNormalizedTimeValue( dateTime[ 1 ] );
                                dbValue = dateTimeSvc.setTimeIntoDateModel( dateValue, timeValue );
                            } else {
                                dbValue = uwDirectiveDateTimeSvc.parseDate( dateTime[ 0 ] );
                            }
                        }
                    }

                    chosenLovEntry = {
                        propInternalValue: dbValue,
                        propDisplayValue: dateTimeSvc.formatSessionDateTime( dbValue )
                    };
                } else {
                    chosenLovEntry = {
                        propInternalValue: uiProperty.dbValue,
                        propDisplayValue: uiProperty.uiValue,
                        suggested: true
                    };

                    /**
                     * If user enters the correct value but doesn't select it from list,
                     * then compare the user entered value with the display value of lov entries list and if it matches set lov entry object from lov entries list.
                     */
                    for( var i = 0; i < $scope.lovEntries.length; i++ ) {
                        if( isUserManuallyTyped && $scope.lovEntries[ i ].propDisplayValue === chosenLovEntry.propDisplayValue ) {
                            chosenLovEntry = $scope.lovEntries[ i ];
                            isUserManuallyTyped = false;
                            break;
                        }
                        if( $scope.lovEntries[ i ].propDisplayValue === chosenLovEntry.propDisplayValue &&  _.isEqual( $scope.lovEntries[ i ].propInternalValue, chosenLovEntry.propInternalValue ) ) {
                            chosenLovEntry = $scope.lovEntries[ i ];
                            break;
                        }
                    }
                }
            }
            return chosenLovEntry;
        };

        /**
         * Called by the 'uwListService' when exiting an LOV choice field.
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {Object} $event - exit event
         * @param {Number} attnIndex - Index in the LOV selected by the user (or 'null' if user has cleared the field.
         * @param {Boolean} skipFocusElem - focus on exit?
         */
        $scope.handleFieldExit = function( $event, attnIndex, skipFocusElem ) {
            var chosenLovEntry;

            if( _.isNumber( attnIndex ) && attnIndex >= 0 ) {
                chosenLovEntry = $scope.lovEntries[ attnIndex ];
            } else {
                // attempt to set the filter text as the new value
                chosenLovEntry = $scope.retrieveLovEntryWithFilterText();
            }

            $scope.setLovEntry( chosenLovEntry, $event, skipFocusElem );
        };

        /**
         * Called to update the dbValue based on uiValue and data type.
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {LOVEntry} lovEntry - The LOVEntry object containing the values to set the scope property's 'ui'
         *            and 'db' values based upon.
         */
        $scope.updateDbValue = function( lovEntry ) {
            // Initially the 'dbOriginalValue' is empty, avoid applying 'ng-dirty' class.
            var changed = $scope.prop.dbOriginalValue !== lovEntry.propInternalValue;

            // update the dbValue based on the uiValue
            if( uiProperty.type === 'DATE' || uiProperty.type === 'DATEARRAY' ) {
                if( dateTimeSvc.isNullDate( lovEntry.propInternalValue ) ) {
                    uiProperty.dbValue = '';
                    uiProperty.uiValue = '';
                } else {
                    uiProperty.dbValue = dateTimeSvc.getJSDate( lovEntry.propInternalValue );
                    uiProperty.uiValue = dateTimeSvc.formatSessionDateTime( uiProperty.dbValue );
                }
            } else {
                if( uiProperty.type === 'OBJECT' || uiProperty.type === 'OBJECTARRAY' ) {
                    // If propDisplayValue was manually entered and not selected from dropdown, reset dbValue
                    if( uiProperty.uiOriginalValue !== lovEntry.propDisplayValue && uiProperty.dbOriginalValue === lovEntry.propInternalValue ) {
                        lovEntry.propInternalValue = null;
                    }
                }
                uiProperty.dbValue = lovEntry.propInternalValue;
                uiProperty.uiValue = lovEntry.propDisplayValue;
            }

            /**
             * For integer and double we have to actually see if it is valid number and then convert it into number
             * type accordingly or else throw an error
             */
            if( uiProperty.type === 'INTEGER' || uiProperty.type === 'DOUBLE' ||
                uiProperty.type === 'INTEGERARRAY' || uiProperty.type === 'DOUBLEARRAY' ) {
                var newDbValue;
                if( uiProperty.type === 'INTEGER' || uiProperty.type === 'INTEGERARRAY' ) {
                    newDbValue = uwValidationSvc.checkInteger( $scope, null, lovEntry.propInternalValue );
                } else {
                    newDbValue = uwValidationSvc.checkDouble( $scope, null, lovEntry.propInternalValue );
                }
                // set the converted number to the dbValue
                lovEntry.propInternalValue = newDbValue;
                uiProperty.dbValue = newDbValue;
            } else if( uiProperty.type === 'DATE' || uiProperty.type === 'DATEARRAY' ) {
                var dateObject;

                if( lovEntry.propInternalValue ) {
                    dateObject = dateTimeSvc.getJSDate( lovEntry.propInternalValue );
                    dateObject = uwValidationSvc.checkDateTime( $scope, dateObject );
                } else {
                    dateObject = dateTimeSvc.getNullDate();
                }

                changed = dateTimeSvc.compare( $scope.prop.dbOriginalValue, dateObject ) !== 0;

                if( changed ) {
                    if( dateTimeSvc.isNullDate( dateObject ) ) {
                        uiProperty.dbValue = '';
                        uiProperty.uiValue = '';
                    } else {
                        uiProperty.dbValue = dateObject;
                        uiProperty.uiValue = dateTimeSvc.formatSessionDateTime( dateObject );
                    }
                }
            }
        };

        /**
         * Bound via 'ng-blur' on the 'input' element and called on input 'blur' (i.e. they leave the field)
         *
         *
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.blurLovFunction = function() {
            var lovEntry;
            // attempt to set the filter text as the new value
            var uiProperty = $scope.prop;
            lovEntry = $scope.retrieveLovEntryWithFilterText();

            // Initially the 'dbOriginalValue' is empty, avoid applying 'ng-dirty' class.
            var changed = $scope.prop.dbOriginalValue !== lovEntry.propInternalValue ||
                uiProperty.uiOriginalValue !== lovEntry.propDisplayValue;
            $scope.updateDbValue( lovEntry );

            if( changed && !uiProperty.isArray && validateLovOnBlur ) {
                validateLovOnBlur = false;
                var promise = uwPropertySvc.updateViewModelProperty( uiProperty );

                if( uiProperty.type === 'OBJECT' || uiProperty.type === 'OBJECTARRAY' ) {
                    // We are not updating the db value for object based lov for filtered text, to work the reset values we need to update valueUpdated property based on uiValue Change.
                    uiProperty.valueUpdated = true;
                    if( promise ) {
                        promise.then( function() {
                            $scope.validateLOVValueSelections( uiProperty, lovEntry );
                        }, function( error ) {
                            if( error.cause.partialErrors || error.cause.PartialErrors ) {
                                uwPropertySvc.setServerValidationError( uiProperty, true );
                                uwValidationSvc.setErrorMessage( $scope, error.message );
                            }
                        } );
                    } else {
                        $scope.validateLOVValueSelections( uiProperty, lovEntry );
                    }
                }
            }
        };

        /**
         * Validate the LOV value selections in case the uiProperty does not have errors.
         *
         * @param {Object} uiProp - uiProp object
         * @param  {Object} lovEntry - lov val to validate
         * @returns {Promise} that can be optionally used to post-process (used for arrays)
         */
        $scope.validateLOVValueSelections = function( uiProp, lovEntry ) {
            var deferred = $q.defer();
            var requiredError = null;
            if( uiProp.isRequired && !uiProp.uiValue ) {
                requiredError = true;
                localeService.getTextPromise().then( function( localTextBundle ) {
                    uwValidationSvc.setErrorMessage( $scope, localTextBundle.PROP_REQUIRED_ERROR );
                    deferred.resolve( false );
                } );
            } else {
                requiredError = false;
                uwValidationSvc.setErrorMessage( $scope, null );
            }

            if( !requiredError || uiProp.hasServerValidationError ) {
                // defer validation on array lovs since value isn't set until added to the array
                var lovEntryForValidation = [];
                if( uiProp && uiProp.selectedLovEntries && uiProp.selectedLovEntries.length > 0 ) {
                    lovEntryForValidation = uiProp.selectedLovEntries;
                } else {
                    lovEntryForValidation.push( lovEntry );
                }

                var validatePromise = uwLovDataSvc.validateLOVValueSelections( uiProp.lovApi,
                    lovEntryForValidation, uiProp.propertyName );
                if( validatePromise ) {
                    validatePromise.then( function( validationResult ) {
                        // Note:
                        // Save edit is fired before blur of an edited table cell if save is clicked while still focussed in cell,
                        // this causes the save SOA to execute before the lovValidation SOA. There is a special-case in AR where
                        // validation happens on save, but not on lovValidation which causes bad data in the ui.
                        // Checking editable here avoids that case...
                        if( validationResult.valid && uiProp.isEditable !== false ) {
                            if( !uiProp.isArray ) {
                                if( uiProp.type === 'DATE' ) {
                                    uiProp.dbValue = new Date( lovEntry.propInternalValue );

                                    uiProp.uiValue = dateTimeSvc.formatSessionDateTime( uiProp.dbValue );
                                } else {
                                    uiProp.dbValue = lovEntry.propInternalValue;
                                    uiProp.uiValue = lovEntry.propDisplayValue;
                                }

                                uiProp.dbValues = [ uiProp.dbValue ];
                                uiProp.uiValues = [ uiProp.uiValue ];
                            }

                            // update orig vals on validation
                            $scope.prop.dbOriginalValue = uiProp.dbValue;
                            $scope.prop.uiOriginalValue = uiProp.uiValue;

                            // Update dependent properties
                            _.forEach( validationResult.updatedPropValueMap, function( values, propertyName ) {
                                var sourceObjectUid = uwPropertySvc.getSourceObjectUid( uiProp );
                                var toBeModifiedProp = validationResult.viewModelObj
                                    .retrievePropertyWithBasePropertyName( propertyName, sourceObjectUid );
                                if( toBeModifiedProp ) {
                                    var eventData = { removeValues: toBeModifiedProp.dbValue };
                                    uwPropertySvc.setValue( toBeModifiedProp, values );
                                    uwPropertySvc.setWidgetDisplayValue( toBeModifiedProp,
                                        validationResult.updatedPropDisplayValueMap[ propertyName ] );
                                    eventBus.publish( toBeModifiedProp.propertyName + '.arrayValueRemoved', eventData );
                                }
                            } );

                            uwPropertySvc.setServerValidationError( uiProp, false );
                            uwValidationSvc.setErrorMessage( $scope, null );
                            var eventData = {
                                lovValue: lovEntry
                            };
                            eventBus.publish( $scope.prop.propertyName + '.lovValueChanged', eventData );
                            deferred.resolve( validationResult.valid );
                        } else {
                            if( validationResult.error ) {
                                uwPropertySvc.setServerValidationError( uiProp, true );
                                uwValidationSvc.setErrorMessage( $scope, validationResult.error );
                            }
                        }
                    }, function( error ) {
                        if( error.cause.partialErrors || error.cause.PartialErrors ) {
                            uwPropertySvc.setServerValidationError( uiProp, true );
                            uwValidationSvc.setErrorMessage( $scope, error.message );
                        }
                        deferred.resolve( false );
                    } );
                } else {
                    deferred.resolve( true );
                }
            } else {
                deferred.resolve( false );
            }

            // we need to standardize vm prop behaviors; not sure updating "orig" values makes sense on validation
            // but we have some deps on it now, so making it a bit more consistent
            $scope.prop.dbOriginalValue = uiProp.dbValue;
            $scope.prop.uiOriginalValue = uiProp.uiValue;

            return deferred.promise;
        };

        /**
         * Called to set a new prop value via a pick or explicit set from tab, enter, or blur
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {LOVEntry} lovEntry - The LOVEntry object containing the values to set the scope property's 'ui'
         *            and 'db' values based upon.
         * @param {Object} $event - DOM event
         * @param {Boolean} skipFocusElem - (Optional) TRUE if we DO NOT want to focus the element after setting the
         *            LOV value.
         */
        $scope.setLovEntry = function( lovEntry, $event, skipFocusElem ) {
            if( uiProperty !== $scope.prop ) {
                uiProperty = $scope.prop;
            }
            uwListSvc.collapseList( $scope );

            // Initially the 'dbOriginalValue' is empty, avoid applying 'ng-dirty' class.
            var changed = lovEntry && $scope.prop.dbOriginalValue !== lovEntry.propInternalValue;

            $scope.listFilterText = '';

            var $choiceElem = $element.find( '.aw-jswidgets-choice' );
            var $inputElem = $event;

            // Event object is undefined when body 'click' event is fired. Set choice element to input element.
            if( !uwUtilSvc.ifElementExists( $event ) ) {
                $inputElem = $choiceElem;
            }

            if( changed ) {
                // only udpate value when changed
                $scope.updateDbValue( lovEntry );

                /**
                 * By default we set the first element (i.e. index = 0) for listbox widget, which also adds dirty
                 * flag. we need to ignore it by checking whether there is a index property or index is not equal to
                 * zero. Note: Index property is not defined for dynamic lovs.
                 */
                if( !lovEntry.hasOwnProperty( 'index' ) || lovEntry.index !== 0 ) {
                    /**
                     * Instead of relying on AbstractUICell's getEditedUIObjects(), we are tracking ourselves. Set
                     * "dirty" via $setDirty() so that it sets $dirty flag in angular form validation
                     */
                    var ngModelCtrl = $inputElem.controller( 'ngModel' );
                    ngModelCtrl.$setDirty();
                }

                /**
                 * Update the view model with the values set just above.
                 */
                if( !uiProperty.isArray ) {
                    uiProperty.selectedLovEntries = [ lovEntry ];
                    var promise = uwPropertySvc.updateViewModelProperty( uiProperty );
                    if( promise ) {
                        promise.then( function() {
                            $scope.validateLOVValueSelections( uiProperty, lovEntry );
                        } );
                    } else {
                        $scope.validateLOVValueSelections( uiProperty, lovEntry );
                    }
                } else {
                    // don't update array unless lov is validated
                    uiProperty.selectedLovEntries.push( lovEntry );

                    // disable input during validation
                    $choiceElem.prop( 'disabled', true );
                    $scope.validateLOVValueSelections( uiProperty, lovEntry ).then( function( valid ) {
                        if( valid ) {
                            uiProperty.updateArray( $inputElem );
                        } else {
                            uiProperty.selectedLovEntries.pop();
                        }
                        $choiceElem.prop( 'disabled', false );
                    } );
                }
            } else if( uiProperty && uiProperty.hasServerValidationError ) {
                // revalidate in case error was caused by non-dropdown entry ( manually typed by user )
                $scope.validateLOVValueSelections( uiProperty, lovEntry );
            }

            /**
             * Always leave the <input> node as the keyboard focus .
             */
            if( !skipFocusElem ) {
                $choiceElem.focus();
            }
        };

        /**
         * Do we have any values for the lov?
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @returns {Boolean} TRUE if the current LOV is NOT empty.
         */
        $scope.hasValues = function() {
            if( $scope.queueIdle ) {
                if( $scope.lovEntries.length === 0 ||
                    $scope.lovEntries.length === 1 && $scope.lovEntries[ 0 ].isEmptyEntry ) {
                    return false;
                }
            }

            return true;
        };

        /**
         * Get the initial values.
         *
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.requestInitialLovEntries = function() {
            $scope.$evalAsync( function() {
                $scope.lovEntries = [];
                $scope.moreValuesExist = true;
                $scope.queueIdle = false;
                $scope.lovInitialized = true;
            } );

            // if the lovApi isn't initialized, see if we can do so now from the prop's dataProvider
            // might be better to do this sooner (viewModelProcessingFactory)
            uwLovDataSvc.initLovApi( $scope );

            uwLovDataSvc.promiseInitialValues( $scope.prop.lovApi, $scope.listFilterText, $scope.prop.propertyName )
                .then( $scope.processInitialLovEntries, $scope.processError );
        };

        /**
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.requestFilteredLovEntries = function() {
            // wait for a 300ms pause before submitting...
            clearTimeout( idleTimer );
            idleTimer = setTimeout( function() {
                $scope.requestInitialLovEntries();
            }, 300 );
        };

        /**
         * Get the next set of vals (bound to 'aw-when-scrolled' attribute directive).
         *
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.requestNextLovEntries = function() {
            /**
             * This can get called from multiple places.... which would be fine except that the fx implementation
             * will return duplicate values on sequential requests... therefore, throttle here...
             */
            if( $scope.lovInitialized && $scope.moreValuesExist && $scope.queueIdle ) {
                $scope.queueIdle = false;

                uwLovDataSvc.promiseNextValues( $scope.prop.lovApi, $scope.prop.propertyName ).then(
                    $scope.processLovEntries, $scope.processError );
            }
        };

        /**
         * Move the LOV information from the values returned from the SOA request into the property's local LOV
         * entry array.
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {ObjectArray} lovEntries - Array of LOV Entry objects returned from the SOA service.
         */
        $scope.processInitialLovEntries = function( lovEntries ) {
            // clear lovEntries to avoid racing filter results...
            $scope.lovEntries = [];
            $scope.processLovEntries( lovEntries );
        };

        /**
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {ObjectArray} lovEntries - Array of LOV Entry objects returned from the SOA service.
         */
        $scope.processLovEntries = function( lovEntries ) {
            $scope.queueIdle = true;

            if( lovEntries && lovEntries.length === 0 ) {
                // we have all the vals now...
                $scope.moreValuesExist = false;
            } else if( lovEntries && lovEntries.moreValuesExist !== undefined ) {
                $scope.moreValuesExist = lovEntries.moreValuesExist;
            }

            var firstSet = true;

            if( $scope.lovEntries.length ) {
                firstSet = false;
            }

            // for static type do client side filtering
            var lovEntriesFinal = lovEntries;

            if( $scope.prop.lovApi.type === 'static' ) {
                var filterText = $scope.listFilterText ? $scope.listFilterText.toLowerCase() :
                    $scope.listFilterText;

                lovEntriesFinal = $filter( 'filter' )(
                    lovEntriesFinal,
                    function( value ) {
                        if( filterText ) {
                            var prodisplayValue = //
                                value.propDisplayValue ? value.propDisplayValue.toLowerCase() : '';

                            var prodisplayDescValue = //
                                value.propDisplayDescription ? value.propDisplayDescription.toLowerCase() : '';

                            return _.includes( prodisplayValue, filterText ) || _.includes( prodisplayDescValue,
                                filterText );
                        }

                        return true;
                    } );
            }

            /**
             * Add an 'empty' entry as the 1st entry in the list to allow the user the ability to un-set a property.
             *
             * <P>
             * Note: If there are no entries after any filtering, then there is no need for the empty entry.
             *
             */
            var firstNonEmpty = 0;

            if( firstSet && !_.isEmpty( lovEntriesFinal ) ) {
                var lovEntryEmpty = {
                    propDisplayValue: '',
                    propInternalValue: _.isString( $scope.prop.dbValue ) ? '' : null,
                    sel: false,
                    attn: false,
                    isEmptyEntry: true
                };

                $scope.lovEntries.push( lovEntryEmpty );

                firstNonEmpty = 1;
            }

            ngModule.forEach( lovEntriesFinal, function( lovEntry ) {
                // resetting selected flag to false for static type
                if( $scope.prop.lovApi.type === 'static' ) {
                    lovEntry.sel = false;
                    lovEntry.attn = false;
                }

                // append new value to model
                var lovDbValue = lovEntry.propInternalValue;

                if( uiProperty.type === 'DATE' || uiProperty.type === 'DATEARRAY' ) {
                    lovDbValue = dateTimeSvc.getJSDate( lovEntry.propInternalValue );
                    lovEntry.propDisplayValue = dateTimeSvc.formatSessionDateTime( lovDbValue );

                    var result = dateTimeSvc.compare( uiProperty.dbValue, lovDbValue );

                    if( result === 0 ) {
                        lovEntry.sel = true;
                        lovEntry.attn = true;
                        lovEntriesFinal[ 0 ].attn = false;
                    }

                    // ********
                    // ********
                    // Note: Use coercive compare to support cases comparing a number to a string
                    // ******** Do not clean up lint warning.
                    // ********
                } else if( uiProperty.dbValue == lovDbValue ) { // eslint-disable-line eqeqeq
                    lovEntry.sel = true;
                    lovEntry.attn = true;
                    lovEntriesFinal[ 0 ].attn = false;
                }

                if( $scope.lovEntries.length === firstNonEmpty && $scope.listFilterText ) {
                    // focus attention on first value if we've done any filtering
                    lovEntry.attn = true;
                }

                $scope.lovEntries.push( lovEntry );
            } );

            /**
             * If this is the first set of values (not appending to an existing set), autoscroll to the selected or
             * attention value.
             */
            if( firstSet ) {
                /**
                 * For static lovs (i.e. listBox) remove the first value from the list which is an empty lov entry.
                 *
                 */
                if( !_.isUndefined( $scope.prop.emptyLOVEntry ) && !$scope.prop.emptyLOVEntry ) {
                    $scope.lovEntries.shift();
                }
            }
        };

        /**
         * Call this if there is an error calling our service
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {String} reason -
         */
        $scope.processError = function( reason ) {
            // placeholder function. do nothing; error should already be handled.
            $scope.queueIdle = true;
            logger.error( 'error: ' + reason );
        };

        /**
         *
         * @memberof NgControllers.awPropertyLovController
         *
         * @param {Object} lovEntry - The LOVEntry object containing the values to set the scope property's 'ui' and
         *            'db' values based upon.
         */
        $scope.setSelectedLOV = function( lovEntry ) {
            /**
             * Set skipFocusElem flag to true so that it doesn't focus on listBox during setting the default value
             * programmatically.
             */
            $scope.setLovEntry( lovEntry, null, true );

            // set uiOriginalValue and dbOriginalValue for static lov widget if they are null/empty,
            // which is used by escape key for reverting value.
            if( !uiProperty.uiOriginalValue && !uiProperty.dbOriginalValue ) {
                uiProperty.uiOriginalValue = lovEntry.propDisplayValue;
                uiProperty.dbOriginalValue = lovEntry.propInternalValue;
            }

            // set dbOriginalValue for static lov widget if it is null/empty,
            if( !$scope.prop.dbOriginalValue ) {
                $scope.prop.dbOriginalValue = lovEntry.propInternalValue;
            }
        };

        $scope.$on( 'lovEntries.update', function( event, eventData ) {
            $scope.lovEntries = eventData;
        } );

        // Collapse on window resize
        $scope.$on( 'windowResize', function() {
            if( $scope.expanded ) {
                $scope.handleFieldExit();
            }
        } );

        /**
         * @memberof NgControllers.awPropertyLovController
         */
        $scope.$on( '$destroy', function() {
            if( $scope.$scrollPanel ) {
                $scope.$scrollPanel.off( 'scroll.lov' );
                $scope.$scrollPanel = null;
            }

            if( $scope.listener ) {
                $scope.listener();
            }

            /**
             * Remove any references to DOM elements (or other non-trivial objects) from this scope. The purpose is
             * to help the garbage collector do its job.
             */
            if( $scope.myCtrl ) {
                $scope.myCtrl.$parent = null;
                $scope.myCtrl = null;
            }

            if( arrayValueRemovedSubscriber ) {
                eventBus.unsubscribe( arrayValueRemovedSubscriber );
            }

            $scope.lovEntries = null;
            $scope.prop = null;
        } );
    }
] );
