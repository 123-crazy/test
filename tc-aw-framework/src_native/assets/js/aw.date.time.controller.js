// Copyright (c) 2020 Siemens

/**
 * @module js/aw.date.time.controller
 */
import app from 'app';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import 'js/dateTimeService';
import 'js/uwPropertyService';
import 'js/uwListService';
import 'js/uwValidationService';
import 'js/uwUtilService';
import 'js/uwDirectiveDateTimeService';
import 'js/viewModelService';
import { isNil } from 'lodash';

/**
 * Defines the date time property value controller
 *
 * @memberof NgControllers
 * @member awDateTimeController
 */
app.controller( 'awDateTimeController', [
    '$scope',
    '$element',
    'dateTimeService',
    'uwPropertyService',
    'uwListService',
    'uwValidationService',
    'uwUtilService',
    'uwDirectiveDateTimeService',
    'viewModelService',
    function( $scope, $element, dateTimeSvc, uwPropertySvc, uwListSvc, uwValidationSvc, uwUtilSvc,
        uwDirectiveDateTimeSvc, viewModelSvc ) {
        var self = this;

        if( !$scope.prop ) {
            return;
        }
        var uiProperty = $scope.prop;
        var prevTimeValue = '00:00:00';

        uiProperty.uiOriginalValue = uiProperty.uiValue;
        uiProperty.dbOriginalValue = uiProperty.dbValue;

        if( !uiProperty.dbValue ) {
            uiProperty.dbValue = dateTimeSvc.getNullDate().getTime();
            uiProperty.dbOriginalValue = uiProperty.dbValue;
        }

        $scope.lovEntries = [];
        $scope.expanded = false;
        $scope.moreValuesExist = true;
        $scope.lovInitialized = false;

        /**
         * TRUE if we are NOT waiting for any values to be returned by the server.
         *
         * @memberof NgControllers.awDateTimeController
         * @private
         */
        $scope.queueIdle = true;

        $scope.dropPosition = 'below';

        $scope.dropDownVerticalAdj = 0;
        $scope.listFilterText = '';

        /**
         * Set the 'dateValue' to a default date (usually 'today') IF date is currently enabled and
         * there is NO current 'dateValue'.
         *
         * @memberof NgControllers.awDateTimeController
         * @private
         */
        self._assureDateValue = function() {
            var dateApi = $scope.prop.dateApi;

            /**
             * Check if are dealing with date AND there is NO valid text value entered yet. <BR>
             * If so: Get a default date (i.e. 'now')
             */
            if( dateApi.isDateEnabled && !dateApi.dateValue ) {
                $element.addClass( 'ng-dirty' );

                dateApi.dateObject = dateTimeSvc.getDefaultDate( dateApi );
                dateApi.dateValue = uwDirectiveDateTimeSvc.formatDate( dateApi.dateObject );
            }
        };

        /**
         * Set the 'timeValue' to a default date (usually 'now') IF time is currently enabled and there
         * is NO current 'timeValue'.
         *
         * @memberof NgControllers.awDateTimeController
         * @private
         */
        self._assureTimeValue = function() {
            var dateApi = $scope.prop.dateApi;

            /**
             * Check if are dealing with time AND there is no valid text value entered yet.<BR>
             * If so: Get a default time (i.e. 'now')
             */
            if( dateApi.isTimeEnabled && !dateApi.timeValue ) {
                var inputElem = $element.parents( '.aw-jswidgets-dateTimeInputbox' ).find(
                    '.aw-jswidgets-choice' );
                var ngModelTimeCtrl = inputElem.controller( 'ngModel' );

                if( ngModelTimeCtrl ) {
                    ngModelTimeCtrl.$setDirty();
                }

                var defaultDate = dateTimeSvc.getDefaultDate( dateApi );
                prevTimeValue = dateApi.timeValue = dateTimeSvc.formatTime( defaultDate );
            }
        };

        /**
         * @memberof NgControllers.awDateTimeController
         * @private
         *
         * @param lovEntries
         * @param dateApi
         *
         * @return {Void}
         */
        self._setSelectedTimeValue = function( lovEntries, dateApi ) {
            var dateNotEnabledTimeEnabled = !dateApi.isDateEnabled && dateApi.isTimeEnabled;
            var dateEnabledTimeNotEnabled = dateApi.isDateEnabled && !dateApi.isTimeEnabled;
            var dateAndTimeEnabled = dateApi.isDateEnabled && dateApi.isTimeEnabled;

            // Validate the date
            var parentElem = $element.parents( '.aw-jswidgets-dateTimeInputbox' );
            var dateElem = parentElem.find( '[aw-datebox]' );
            var dateScope = $( dateElem ).scope();

            // Validate the time
            var timeElem = parentElem.find( '.aw-jswidgets-timepicker' );
            var timeScope = $( timeElem ).scope();

            if( dateNotEnabledTimeEnabled ) {
                uwValidationSvc.checkTime( timeScope, dateApi.timeValue, true );
            } else if( dateEnabledTimeNotEnabled ) {
                uwValidationSvc.checkDate( dateScope, dateApi.dateValue, true );
            } else if( dateAndTimeEnabled ) {
                var dateValid = uwValidationSvc.checkDate( dateScope, dateApi.dateValue, true );
                if ( dateValid ) {
                    uwValidationSvc.checkTime( timeScope, dateApi.timeValue, true );
                }
            }

            if( $scope.errorApi && $scope.errorApi.errorMsg ) {
                return;
            }

            var timeObject = dateTimeSvc.getDateFromTimeValue( dateApi.timeValue );

            if( !timeObject ) {
                return;
            }

            var msCurrent = timeObject.getHours() * 60 * 60 * 1000 +
                timeObject.getMinutes() * 60 * 1000 + timeObject.getSeconds() * 1000;

            var closestNdx = Math.floor( msCurrent / ( 30 * 60 * 1000 ) );

            for( var ndx = 0; ndx < lovEntries.length; ndx++ ) {
                var lovEntry = lovEntries[ ndx ];

                if( ndx === closestNdx ) {
                    lovEntry.sel = true;
                    lovEntry.attn = true;
                } else {
                    lovEntry.sel = false;

                    if( ndx < lovEntries.length - 1 && msCurrent > lovEntry.propInternalValue &&
                        msCurrent < lovEntries[ ndx + 1 ].propInternalValue ) {
                        lovEntry.attn = true;
                    } else {
                        lovEntry.attn = false;
                    }
                }
            }
        };

        /**
         * @memberof NgControllers.awDateTimeController
         *
         * @param {String} lovDisplayValue -
         *
         * @private
         */
        self._setTimeToModel = function( lovDisplayValue ) {
            var dateApi = $scope.prop.dateApi;

            /**
             * Check if we actually have a time value to set<BR>
             * If so: Make sure we have a date to go along with it.
             */
            if( lovDisplayValue ) {
                self._assureDateValue();
            }

            /**
             * Set the final display based upon the time string converted to a date and then back to
             * text using the current format.
             * <P>
             * Broadcast the change.
             */
            dateApi.timeValue = dateTimeSvc.getNormalizedTimeValue( lovDisplayValue );
        };

        /**
         * Using the current scope's property's 'dateObject' and 'timeValue', update the 'dbValue' and
         * push changes back to the 'host' view model.
         *
         * @memberof NgControllers.awDateTimeController
         * @private
         */
        self._updateWidgetModel = function() {
            if( $scope.prop ) {
                var uiProperty = $scope.prop;
                var dateApi = uiProperty.dateApi;
                var dateScope;
                var timeScope;

                // Validate the date
                var parentElem = $element.parents( '.aw-jswidgets-dateTimeInputbox' );
                var dateElem = parentElem.find( '[aw-datebox]' );
                dateScope = $( dateElem ).scope();

                // Validate the time
                var timeElem = parentElem.find( '.aw-jswidgets-timepicker' );
                timeScope = $( timeElem ).scope();

                if ( !dateApi.isTimeEnabled && dateApi.isDateEnabled ) {
                    uwValidationSvc.checkDate( dateScope, dateApi.dateValue, true );
                } else if ( dateApi.isTimeEnabled && !dateApi.isDateEnabled ) {
                    uwValidationSvc.checkTime( timeScope, dateApi.timeValue, false );
                } else {
                    var dateValid = uwValidationSvc.checkDate( dateScope, dateApi.dateValue, true );
                    if ( dateValid ) {
                        uwValidationSvc.checkTime( timeScope, dateApi.timeValue, true );
                    }
                }

                var dateWithTime = null;

                if( dateApi.isTimeEnabled ) {
                    if( dateApi.isDateEnabled && dateApi.dateObject ) {
                        dateWithTime = dateTimeSvc.setTimeIntoDateModel( dateApi.dateObject,
                            dateApi.timeValue );
                    } else {
                        dateWithTime = dateTimeSvc.setTimeIntoDateModel( dateTimeSvc.getEpochDate(),
                            dateApi.timeValue );
                    }
                } else if( dateApi.isDateEnabled && !dateApi.isTimeEnabled && dateApi.dateObject ) {
                    /**
                     * Add time to date only when time is enabled, i.e, DATETIME type property
                     * For DATE type property we should not add any default time
                     */
                    dateWithTime = dateApi.dateObject;
                }

                var diff = isNil( dateWithTime ) ?  undefined : uiProperty.dbValue - dateWithTime.getTime();
                var compareCheck = 0;

                if( !isNaN( diff ) ) {
                    if( diff === 0 ) {
                        compareCheck = 0;
                    } else if( diff > 0 ) {
                        compareCheck = 1;
                    } else {
                        compareCheck = -1;
                    }
                }

                var changed = compareCheck !== 0;

                /**
                 * For DATE type property we should use formatSessionDate
                 * For TIME type property we should use formatSessionTime
                 * FOR DATETIME type property we should use formatSessionDateTime
                 * Also handles a reset of the property.
                 */
                if( changed ) {
                    if( dateWithTime && dateApi.dateValue !== '' ) {
                        uiProperty.dbValue = dateWithTime.getTime();
                        if( !dateApi.isTimeEnabled && dateApi.isDateEnabled ) {
                            uiProperty.uiValue = dateTimeSvc.formatSessionDate( dateWithTime );
                        } else if( dateApi.isTimeEnabled && !dateApi.isDateEnabled ) {
                            uiProperty.uiValue = dateTimeSvc.formatSessionTime( dateWithTime );
                        } else {
                            uiProperty.uiValue = dateTimeSvc.formatSessionDateTime( dateWithTime );
                        }
                    } else {
                        uiProperty.dbValue = dateTimeSvc.getNullDate().getTime();
                        uiProperty.uiValue = '';
                        dateApi.dateValue = '';
                        dateApi.timeValue = '';
                    }

                    if( !uiProperty.isArray ) {
                        uwPropertySvc.updateViewModelProperty( uiProperty );
                    }
                }
            }
        };

        $scope.toggleDatePickerVisibility = function( inputElement ) {
            var jqElement = $( inputElement );
            var isClosed = !jqElement.closest( '.aw-jswidgets-dateInputbox' ).hasClass(
                'aw-jswidgets-popUpVisible' );
            if( isClosed ) {
                jqElement.datepicker( 'show' );
                /**
                 * Adding 'aw-jswidgets-popUpVisible' css which specifies whether the date widget
                 * dropdown is visible
                 */
                $( inputElement ).closest( '.aw-jswidgets-dateInputbox' ).addClass(
                    'aw-jswidgets-popUpVisible' );
            } else {
                jqElement.datepicker( 'hide' );
                jqElement.removeClass( 'aw-jswidgets-popUpVisible' );
            }
        };

        /**
         * @memberof NgControllers.awDateTimeController
         * @private
         *
         * @param {DOMElement} inputElement -
         */
        $scope.buildDatepickerUI = function( inputElement, attrs, ngModelCtrl ) {
            var jqElement = $( inputElement );

            /**
             * Check if we have NOT built a date picker for this element yet.<BR>
             * If so: Build it now.
             */
            if( !jqElement.hasClass( 'hasDatepicker' ) ) {
                /**
                 * Pull all attributes from the parent (to be used during option building)
                 */
                var jqParentValElem = jqElement.closest( 'aw-property-date-val' );

                var optionAttrs = attrs;

                if( jqParentValElem ) {
                    optionAttrs = jqParentValElem[ 0 ].attributes;
                }

                /**
                 * Create the directive's (input) element's JQueryUI DatePicker. to.
                 */
                var options = $scope.buildDatePickerOptions( optionAttrs, ngModelCtrl );

                jqElement.datepicker( options );

                /**
                 * Setup to open the calendar if they click in the input field in the future.
                 */
                jqElement.click( function() {
                    $scope.toggleDatePickerVisibility( inputElement );
                } );

                uwUtilSvc.handleScroll( $scope, $element, 'dateTime', function() {
                    jqElement.datepicker( 'option', 'showAnim', 'show' );
                    jqElement.datepicker( 'hide' );
                    jqElement.datepicker( 'option', 'showAnim', 'slideDown' );
                } );
            }

            //work around to avoid issue when work with aw-popup
            $( '#ui-datepicker-div' ).on( 'click',
                function( event ) {
                    event.stopPropagation();
                } );

            $( '#ui-datepicker-div' ).addClass( 'aw-jswidgets-datepicker' );
        };

        /**
         * @memberof NgControllers.awDateTimeController
         * @private
         *
         * @param {Map} attrs - Map of attributes on directive
         *
         * @param {NgModelController} ngModelCtrl -
         *
         * @return {Object} JQueryUI - Datepicker option object populated from the given scope.
         */
        $scope.buildDatePickerOptions = function( attrs, ngModelCtrl ) {
            var update = function( selectedDateValue, datePicker ) {
                // cancel update if user select nothing
                if( !selectedDateValue ) { return; }

                var dateApi = $scope.prop.dateApi;

                var isSelectedDateValid = uwValidationSvc.checkDate( $scope, selectedDateValue, true );

                if ( isSelectedDateValid ) { // valid date
                    $scope.prop.uiValue = selectedDateValue;
                    var dateObj = uwDirectiveDateTimeSvc.parseDate( selectedDateValue );

                    var dateWithTime = null;
                    if( dateApi.isTimeEnabled && dateApi.isDateEnabled && dateObj ) {
                        dateWithTime = dateTimeSvc.setTimeIntoDateModel( dateObj, dateApi.timeValue );
                    }

                    if ( dateWithTime ) {
                        dateApi.dateObject = dateWithTime;
                    } else {
                        dateApi.dateObject = dateObj;
                    }

                    self._assureTimeValue();

                    if( !dateApi.isTimeEnabled && dateApi.isDateEnabled ) {
                        var dateVal = dateTimeSvc.formatSessionDate( dateApi.dateObject );
                        dateApi.dateValue = dateVal;
                        $scope.prop.uiValue = dateVal;
                        ngModelCtrl.$setViewValue( dateApi.dateValue );
                    } else if( dateApi.isTimeEnabled && !dateApi.isDateEnabled ) {
                        var timeVal = dateTimeSvc.formatSessionTime( dateApi.dateObject );
                        dateApi.timeValue = timeVal;
                        $scope.prop.uiValue = timeVal;
                        ngModelCtrl.$setViewValue( dateApi.timeValue );
                    } else {
                        var dateTimeVal = dateTimeSvc.formatSessionDateTime( dateApi.dateObject );
                        $scope.prop.uiValue = dateTimeVal;
                        //reset the dateValue to fix locale time validate issue
                        dateApi.dateValue = uwDirectiveDateTimeSvc.formatDate( dateApi.dateObject );
                        ngModelCtrl.$setViewValue( dateApi.dateValue );
                    }

                    self._updateWidgetModel();
                } else if ( $scope.errorApi.errorMsg && !isSelectedDateValid ) { // invalid date
                    ngModelCtrl.$setViewValue( selectedDateValue );
                    self._updateWidgetModel();
                } else { // null date
                    dateApi.dateObject = dateTimeSvc.getNullDate();
                    dateApi.dateValue = '';
                }

                /**
                 * If time is enabled then automatically open the time pop-up once date is selected.
                 */
                if( dateApi.isTimeEnabled ) {
                    var parentElem = $element.closest( '.aw-jswidgets-dateTimeInputbox' );

                    if( parentElem ) {
                        var timeElem = parentElem.find( '.aw-jswidgets-timepicker' );
                        var timeScope = $( timeElem ).scope();

                        if( timeElem && timeScope && !timeScope.expanded ) {
                            var choiceElem = timeElem.find( '.aw-jswidgets-choice' )[ 0 ];
                            choiceElem.click();
                        }
                    }
                } else if( $scope.prop.isArray &&
                    !dateTimeSvc.isNullDate( new Date( $scope.prop.dbValue ) ) ) {
                    $scope.prop.updateArray();
                }
            };

            /**
             * Basic options for the JQueryUI datepicker. The presence of these members as attributes on
             * an element using the (aw-datebox) attribute directive will effect the display and/or
             * behavior of the JQueryUI datepicker.
             *
             * @constructor AwDateboxOptions
             */
            var options = {};

            /**
             * Add the aw-jswidgets-datepicker css class to override the jquery ui css styling
             *
             * @private
             */
            options.beforeShow = function( inputElement ) {
                /**
                 * Mark the JQueryUI datepicker with AW specific 'marker' styling class.
                 */
                $( '#ui-datepicker-div' ).addClass( 'aw-jswidgets-datepicker' );
            };

            /**
             * Update scope with selected date and remove some CSS.
             *
             * @private
             *
             * @param {String} selectedDateValue -
             */
            options.onSelect = function( selectedDateValue, datePicker ) {
                /**
                 * Note: IE has a problem if we re-assert focus (it pops the calander back up). So, just
                 * don't do that in IE. The other browsers (Chrome, Firefox, Safari) are OK with this.
                 */
                if( !browserUtils.isIE ) {
                    this.focus();
                }

                // It's not possible to get an invalid value out of the picker, clear the errors and custom errors
                $scope.errorApi.errorMsg = null;

                update( selectedDateValue, datePicker );

                /**
                 * If we get an "enter" key, close the datepicker
                 */
                if( datePicker._keyEvent ) {
                    $.datepicker._hideDatepicker();

                    $( this ).closest( '.aw-jswidgets-dateInputbox' ).removeClass(
                        'aw-jswidgets-popUpVisible' );
                }
            };
            options.showOn = 'button';
            /**
             * Remove some CSS.
             *
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             * @private
             */
            options.onClose = function() {
                if( !$scope || !$scope.prop ) { return; }
                /**
                 * Remove 'aw-jswidgets-popUpVisible' css when date widget dropdown is hidden
                 */
                $( this ).closest( '.aw-jswidgets-dateInputbox' ).removeClass(
                    'aw-jswidgets-popUpVisible' );
            };

            // Enable quick navigation by default
            options.changeMonth = true;
            options.changeYear = true;

            /**
             * Setup some other options for testing and evaluations. One or more of these will be
             * eveually made rendering hints or attribute directives to control.
             * <P>
             * For more info, see: http://api.jqueryui.com/datepicker/
             */
            /**
             * Whether the month and year should be rendered as a text instead of dropdown.
             *
             * @member quick-nav
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            if( attrs.quickNav && attrs.quickNav === 'false' || attrs[ 'quick-nav' ] && attrs[ 'quick-nav' ].nodeValue === 'false' ) {
                options.changeMonth = false;
                options.changeYear = false;
            }

            /**
             * The number of months to show at once.
             *
             * @member aw-date-months
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            options.numberOfMonths = 1;

            var nMonths = 0;

            if( attrs.awDateMonths ) {
                nMonths = parseInt( attrs.awDateMonths, 10 );
            } else if( attrs[ 'aw-date-months' ] ) {
                nMonths = parseInt( attrs[ 'aw-date-months' ].nodeValue, 10 );
            }

            if( nMonths > 0 && nMonths < 5 ) {
                options.numberOfMonths = nMonths;
            }

            /**
             * The name of the animation used to show and hide the datepicker
             *
             * @member aw-date-anim
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            options.showAnim = 'slideDown';

            if( attrs.awDateAnim ) {
                options.showAnim = attrs.awDateAnim;
            }

            /**
             * Whether to display a button pane underneath the calendar. The button pane contains two
             * buttons, a Today button that links to the current day, and a Done button that closes the
             * datepicker.
             *
             * @member aw-date-show-buttons
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            options.showButtonPanel = attrs.awDateShowButtons !== undefined;

            /**
             * Defines which position to display the current month in when showing more than one month.
             *
             * @member aw-date-month-position
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            options.showCurrentAtPos = 0;

            var pos = -1;

            if( attrs.awDateMonthPosition ) {
                pos = parseInt( attrs.awDateMonthPosition, 10 );
            } else if( attrs[ 'aw-date-month-position' ] ) {
                pos = parseInt( attrs[ 'aw-date-month-position' ].nodeValue, 10 );
            }

            if( pos > -1 && pos < 4 ) {
                options.showCurrentAtPos = pos;
            }

            /**
             * Whether days in other months shown before or after the current month are selectable.
             *
             * @member aw-date-show-months
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            options.showOtherMonths = attrs.awDateShowMonths !== undefined;

            /**
             * When present, a column is added to show the week of the year.
             *
             * @member aw-date-show-week
             * @memberof module:js/uwDirectiveDateTimeService~AwDateboxOptions
             */
            options.showWeek = attrs.awDateShowWeek !== undefined;

            options.dateFormat = dateTimeSvc.getDateFormat();

            /**
             * Setup JQueryUI datepicker options that are specific to a given property.
             */
            var dateApi = $scope.prop.dateApi;

            if( dateApi.minDate ) {
                options.minDate = dateTimeSvc.getJSDate( dateApi.minDate );
            }

            if( dateApi.maxDate ) {
                options.maxDate = dateTimeSvc.getJSDate( dateApi.maxDate );
            }

            return options;
        };

        /**
         * @memberof NgControllers.awDateTimeController
         */
        $scope.changeDate = function() {
            var dateApi = $scope.prop.dateApi;

            /**
             * Check if the field just went blank<BR>
             * If so: Set the associated JSDate object and clear the time field.
             */
            if( !dateApi.dateValue ) {
                dateApi.dateObject = dateTimeSvc.getNullDate();

                if( $element ) {
                    /**
                     * Set the calendar to the default date (i.e. 'today') and then set a 'null' date to
                     * clear the input field.
                     */
                    var defDate = dateTimeSvc.getDefaultDate( dateApi );

                    var jqElem = $( $element );

                    jqElem.datepicker( 'setDate', defDate );
                    jqElem.datepicker( 'setDate', null );
                }

                prevTimeValue = dateApi.timeValue = '';
            }

            if( $scope.changeAction ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, $scope.changeAction, $scope );
            }

            /**
             * Check if any errors in validation were detected.
             */
            if( $scope.prop.error || $scope.errorApi.errorMsg ) {
                return;
            }

            self._updateWidgetModel();
        };

        /**
         * Bound via 'ng-change' on the 'input' element and called on input change - filter typing
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.changeFunction = function() {
            var dateApi = $scope.prop.dateApi;
            if( dateApi.isTimeEnabled ) {
                if( dateApi.timeValue ) {
                    self._assureDateValue();

                    /**
                     * Select the nearest timeValue in the list.
                     */
                    if( !$scope.lovEntries || $scope.lovEntries.length === 0 ) {
                        $scope.requestInitialLovEntries();
                    } else {
                        self._setSelectedTimeValue( $scope.lovEntries, dateApi );
                    }

                    /**
                     * Open the list
                     */
                    uwListSvc.expandList( $scope, $element );
                    uwListSvc.scrollAttention( $scope, $element );
                }
            }
        };

        /**
         * Bound via 'ng-blur' on the 'input' element and called on input 'blur' (i.e. they leave the
         * field)
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.blurDateFunction = function() {
            var dateApi = $scope.prop.dateApi;

            if( dateApi.isDateEnabled ) {
                /**
                 * Check if we have valid date text value<BR>
                 * If so: Convert it to a date and make sure we have a time value set.<BR>
                 * If not: Record the date/time as 'null'
                 */
                if( dateApi.dateValue ) {
                    try {
                        dateApi.dateObject = uwDirectiveDateTimeSvc.parseDate( dateApi.dateValue );
                    } catch ( e ) {
                        logger.error( e.message );
                    }
                    self._assureTimeValue();
                } else {
                    dateApi.dateObject = dateTimeSvc.getNullDate();
                }

                self._updateWidgetModel();
            }
        };

        /**
         * Bound via 'ng-blur' on the 'input' element and called on input 'blur' (i.e. they leave the
         * field)
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.blurTimeFunction = function() {
            var dateApi = $scope.prop.dateApi;

            if( dateApi.isTimeEnabled ) {
                /**
                 * Check if we have valid time text value<BR>
                 * If so: Convert it to a date and make sure we have a time value set.<BR>
                 * If not: Record the date/time as 'null'
                 */
                if( dateApi.timeValue ) {
                    self._assureDateValue();

                    /**
                     * Select the nearest timeValue in the list.
                     */
                    if( !$scope.lovEntries || $scope.lovEntries.length === 0 ) {
                        $scope.requestInitialLovEntries();
                    } else {
                        self._setSelectedTimeValue( $scope.lovEntries, dateApi );
                    }
                } else {
                    /**
                     * Check if we have a date value<BR>
                     * If so: We need to put the current time in the field.
                     */
                    if( dateApi.dateValue ) {
                        self._assureTimeValue();
                    }

                    /**
                     * Select the nearest timeValue in the list.
                     */
                    if( !$scope.lovEntries || $scope.lovEntries.length === 0 ) {
                        $scope.requestInitialLovEntries();
                    } else {
                        self._setSelectedTimeValue( $scope.lovEntries, dateApi );
                    }
                }

                self._updateWidgetModel();
            }
        };

        /**
         * Evaluate a key press in the 'timeValue' input field.
         *
         * @memberof NgControllers.awDateTimeController
         *
         * @param {Object} event - Keyboard event to evaluate.
         */
        $scope.evalKey = function( event ) {
            uwListSvc.evalKey( $scope, event, $element );
        };

        /**
         * Called by the uwListSvc when user moves the selection cursor using the keyboard.
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.handleFieldSelect = function( selectIndex ) {
            if( selectIndex >= 0 && selectIndex < $scope.lovEntries.length ) {
                for( var ndx = 0; ndx < $scope.lovEntries.length; ndx++ ) {
                    var lovEntry = $scope.lovEntries[ ndx ];

                    lovEntry.attn = false;
                    lovEntry.sel = false;
                }

                var chosenLovEntry = $scope.lovEntries[ selectIndex ];

                chosenLovEntry.attn = true;
                chosenLovEntry.sel = true;

                $scope.setLovEntry( chosenLovEntry, null, true );
            }
        };

        /**
         * Called by the uwListSvc when user escapes out of an LOV choice field. Actions is to revert
         * value.
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.handleFieldEscape = function() {
            var uiProperty = $scope.prop;

            uiProperty.dbValue = uiProperty.dbOriginalValue;
            uiProperty.uiValue = uiProperty.uiOriginalValue;

            $scope.setDateApiValues( uiProperty.dbValue );

            uwPropertySvc.updateViewModelProperty( uiProperty );
        };

        /**
         * Called by the uwListSvc when exiting an LOV choice field.
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.handleFieldExit = function() {
            if( $scope.prop ) {
                var timeValue = $scope.prop.dateApi.timeValue;

                var chosenLovEntry = null;

                if( timeValue ) {
                    uwValidationSvc.checkTime( $scope, timeValue, true );

                    if( !$scope.errorApi.errorMsg ) {
                        var timeObject = dateTimeSvc.getDateFromTimeValue( timeValue );

                        timeValue = $scope.prop.dateApi.timeValue = dateTimeSvc.formatTime( timeObject );

                        if( timeValue ) {
                            chosenLovEntry = {
                                propInternalValue: timeObject.getTime(),
                                propDisplayValue: $scope.prop.dateApi.timeValue
                            };
                        } else {
                            chosenLovEntry = {
                                propInternalValue: dateTimeSvc.getNullDate().getTime(),
                                propDisplayValue: ''
                            };
                        }
                    }
                } else {
                    chosenLovEntry = {
                        propInternalValue: dateTimeSvc.getNullDate().getTime(),
                        propDisplayValue: ''
                    };
                }

                if( chosenLovEntry ) {
                    $scope.setLovEntry( chosenLovEntry );
                }
            }
        };

        /**
         * Get the initial values.
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.requestInitialLovEntries = function() {
            var dateApi = $scope.prop.dateApi;

            $scope.moreValuesExist = false;
            $scope.queueIdle = true;
            $scope.lovInitialized = true;

            $scope.timeLovEntries = dateTimeSvc.getTimeLovEntries();

            $scope.lovEntries = [];

            for( var ndx = 0; ndx < $scope.timeLovEntries.length; ndx++ ) {
                var lovEntry = {
                    propInternalValue: $scope.timeLovEntries[ ndx ].propInternalValue,
                    propDisplayValue: $scope.timeLovEntries[ ndx ].propDisplayValue
                };

                $scope.lovEntries.push( lovEntry );
            }

            /**
             * Make sure we have up-to-date-text
             */
            if( !dateApi.timeValue && dateApi.dateObject ) {
                dateApi.timeValue = dateTimeSvc.formatTime( dateApi.dateObject );
            }

            self._setSelectedTimeValue( $scope.lovEntries, dateApi );
        };

        /**
         * Set all UI values based on the given Milliseconds since 'epoch'.
         *
         * @memberof NgControllers.awDateTimeController
         *
         * @param {Number} timeToApply - Milliseconds since 'epoch'.
         */
        $scope.setDateApiValues = function( timeToApply ) {
            /**
             * Check if we are not fully initialize (This can happen since this function is called from
             * GWT-side code).
             */
            if( !$scope.prop || !$scope.prop.dateApi ) {
                return;
            }

            var dateApi = $scope.prop.dateApi;

            /**
             * Get an object class we can use
             * <P>
             * Check if it is different that what is currently set.
             */
            var jsDate = dateTimeSvc.getJSDate( timeToApply );

            var isDateNull = true;

            if( !isNaN( jsDate ) ) {
                if( !dateTimeSvc.isNullDate( jsDate ) ) {
                    isDateNull = false;

                    if( dateApi.isDateEnabled ) {
                        dateApi.dateObject = jsDate;
                        dateApi.dateValue = uwDirectiveDateTimeSvc.formatDate( jsDate );
                    }

                    if( dateApi.isTimeEnabled ) {
                        dateApi.timeValue = dateTimeSvc.formatTime( jsDate );
                    }
                }
            }

            if( isDateNull ) {
                if( dateApi.isDateEnabled ) {
                    dateApi.dateObject = dateTimeSvc.getNullDate();
                    dateApi.dateValue = '';
                }

                if( dateApi.isTimeEnabled ) {
                    dateApi.timeValue = '';
                }
            }
        };

        /**
         * Called to set a new prop value via a pick or explicit set from tab, enter, or blur
         *
         * @memberof NgControllers.awDateTimeController
         *
         * @param {LOVEntry} lovEntry - The LOVEntry object containing the values to set the scope
         *            property's 'ui' and 'db' values based upon.
         *
         * @param {Boolean} skipCollapse - (Optional) TRUE if the value should be set but the list
         *            should be rmain expanded. FALSE (default) if the list should be collapsed.
         */
        $scope.setLovEntry = function( lovEntry, $event, skipCollapse ) {
            if( !skipCollapse ) {
                uwListSvc.collapseList( $scope );
            }

            var dateApi = $scope.prop.dateApi;
            var skipFocusElem = false;

            var $choiceElem = $element.parents( '.aw-jswidgets-dateTimeInputbox' ).find(
                '.aw-jswidgets-choice' );

            var $inputElem = $event;

            /**
             * Event object is undefined when body 'click' event is fired. Set choice element to input
             * element.
             */
            if( !uwUtilSvc.ifElementExists( $event ) ) {
                $inputElem = $choiceElem;
            }

            /**
             * Check if the user actually selected a different time
             */
            if( prevTimeValue !== lovEntry.propDisplayValue ) {
                self._setTimeToModel( lovEntry.propDisplayValue );
                self._updateWidgetModel();

                if( $scope.prop.isArray && !dateTimeSvc.isNullDate( new Date( $scope.prop.dbValue ) ) ) {
                    $scope.prop.updateArray( $inputElem );
                    // don't focus the element for arrays which might cause adding the value
                    // to array when not needed.
                    skipFocusElem = true;
                }

                prevTimeValue = dateApi.timeValue;

                if( !skipFocusElem ) {
                    var ngModelTimeCtrl = $choiceElem.controller( 'ngModel' );
                    ngModelTimeCtrl.$setDirty();

                    $choiceElem.focus();
                }
            }
        };

        /**
         * Toggle the expand/collapse state of the lov list.
         * <P>
         * Note: Called by (aw-property-time-val) directive template to delegate an 'ng-click' on the
         * text box itself.
         *
         * @memberof NgControllers.awDateTimeController
         */
        $scope.toggleDropdown = function() {
            if( $scope.expanded ) {
                uwListSvc.collapseList( $scope );
            } else {
                /**
                 * For now, do this regardless of whether we already have value data - this is necessary
                 * to deal with interdep lovEntries.
                 * <P>
                 * In the future, we can improve this for efficiency with something like: if (
                 * $scope.moreValuesExist && !$scope.lovInitialized )
                 */
                $scope.requestInitialLovEntries();

                uwListSvc.expandList( $scope, $element );

                uwListSvc.scrollAttention( $scope, $element );
            }
        };

        /**
         * Check if the list has value, for datetime it should be true.
         *
         * @memberof NgControllers.awDateTimeController
         *
         * @returns {Boolean} TRUE for datetime.
         */
        $scope.hasValues = function() {
            return true;
        };

        /**
         * @memberof NgControllers.awDateTimeController
         */
        $scope.$on( '$destroy', function() {
            if( $scope.$scrollPanel ) {
                $scope.$scrollPanel.off( 'scroll.dateTime' );
                $scope.$scrollPanel = null;
            }

            if( $scope.listener ) {
                $scope.listener();
            }

            /**
             * Remove any references to DOM elements (or other non-trivial objects) from this scope. The
             * purpose is to help the garbage collector do its job.
             */
            $scope.lovEntries = null;
            $scope.prop = null;

            if( $( '#ui-datepicker-div' ).length > 0 ) {
                $( '#ui-datepicker-div' ).remove();
            }
            var jqElement = $( $element );

            /**
             * Check if we built a date picker for this element.<BR>
             * If so: Destroy it now.
             */
            if( jqElement.hasClass( 'hasDatepicker' ) ) {
                jqElement.datepicker( 'destroy' );
            }

            jqElement.remove();
            $element.remove();
        } );
    }
] );
