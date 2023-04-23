// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-slider> directive.
 *
 * @module js/aw-slider.controller
 */
import app from 'app';
import $ from 'jquery';
import 'js/viewModelService';
import 'jquerytouch';

/**
 * Defines awSlider controller
 *
 * @member awSliderController
 * @memberof NgControllers
 */
app.controller( 'awSliderController', [
    '$scope',
    '$element',
    '$timeout',
    'viewModelService',
    function( $scope, $element, $timeout, viewModelSvc ) {
        var self = this;
        self._jqElement = $( $element );
        self._sliderElement = self._jqElement.find( '#ui-slider-div' );

        /**
         *
         */
        self._setSliderLabelDisplayValue = function() {
            var sliderLabelDisplayValue = '';
            var labelValuePrefix = '';
            var labelValueSuffix = '';

            if( typeof $scope.prop.dbValue[ 0 ].labelValuePrefix !== 'undefined' ) {
                labelValuePrefix = $scope.prop.dbValue[ 0 ].labelValuePrefix;
            }
            if( typeof $scope.prop.dbValue[ 0 ].labelValueSuffix !== 'undefined' ) {
                labelValueSuffix = $scope.prop.dbValue[ 0 ].labelValueSuffix;
            }

            var displayValueLabelMap = $scope.prop.dbValue[ 0 ].displayValueLabelMap;
            var sliderOption = $scope.prop.dbValue[ 0 ].sliderOption;

            if( sliderOption.range === true ) {
                sliderLabelDisplayValue = labelValuePrefix + sliderOption.values[ 0 ] + labelValueSuffix + ' - ' +
                    labelValuePrefix + sliderOption.values[ 1 ] + labelValueSuffix;
            } else {
                sliderLabelDisplayValue = sliderOption.value;
                if( typeof displayValueLabelMap !== 'undefined' ) {
                    for( var i = 0; i < displayValueLabelMap.length; i++ ) {
                        var displayValueKeyValue = displayValueLabelMap[ i ];
                        if( Array.isArray( displayValueKeyValue.key ) ) {
                            if( sliderOption.value >= displayValueKeyValue.key[ 0 ] &&
                                sliderOption.value <= displayValueKeyValue.key[ 1 ] ) {
                                sliderLabelDisplayValue = displayValueKeyValue.value;
                                break;
                            }
                        } else {
                            if( sliderOption.value === displayValueKeyValue.key ) {
                                sliderLabelDisplayValue = displayValueKeyValue.value;
                                break;
                            }
                        }
                    }
                }
                sliderLabelDisplayValue = labelValuePrefix + sliderLabelDisplayValue + labelValueSuffix;
            }

            $scope.sliderDisplayValue = sliderLabelDisplayValue;
        };

        /**
         *
         */
        $scope.showSliderDisplayValueLabel = $scope.prop.dbValue[ 0 ].showSliderDisplayValueLabel;
        if( $scope.showSliderDisplayValueLabel ) {
            self._setSliderLabelDisplayValue();
        }

        $scope.showIncrementButtons = $scope.prop.dbValue[ 0 ].showIncrementButtons;

        if( $scope.showIncrementButtons ) {
            $scope.minusButtonText = '-';
            $scope.plusButtonText = '+';
        }

        /**
         * set slider disabled
         *
         * @param {boolean} isDisabled - is slider disabled
         * @return {Void}
         */
        $scope.setSliderDisabled = function( isDisabled ) {
            self._sliderElement.slider( 'option', 'disabled', isDisabled );
        };

        /**
         * set slider min value
         *
         * @param {Number} minVal - minimum value for slider
         * @return {Void}
         */
        $scope.setSliderMin = function( minVal ) {
            self._sliderElement.slider( 'option', 'min', minVal );
        };

        /**
         * set slider max value
         *
         * @param {Number} minVal - maximum value for slider
         * @return {Void}
         */
        $scope.setSliderMax = function( maxVal ) {
            self._sliderElement.slider( 'option', 'max', maxVal );
        };

        /**
         * set slider orientation
         *
         * @param {String} orientationVal - slider orientation
         * @return {Void}
         */
        $scope.setSliderOrientation = function( orientationVal ) {
            self._sliderElement.slider( 'option', 'orientation', orientationVal );
        };

        /**
         * set slider range
         *
         * @param {Number} rangeVal - range for slider
         * @return {Void}
         */
        $scope.setSliderRange = function( rangeVal ) {
            self._sliderElement.slider( 'option', 'range', rangeVal );
        };

        /**
         * set slider step value
         *
         * @param {Number} stepVal - step size for slider
         * @return {Void}
         */
        $scope.setSliderStep = function( stepVal ) {
            self._sliderElement.slider( 'option', 'step', stepVal );
        };

        /**
         * set slider current value
         *
         * @param {Number} value - value for slider
         * @return {Void}
         */
        $scope.setSliderValue = function( value ) {
            self._sliderElement.slider( 'option', 'value', value );
            self._setSliderLabelDisplayValue();
        };

        /**
         * set slider values for range slider
         *
         * @param {Array} values - value range for slider
         * @return {Void}
         */
        $scope.setSliderValues = function( values ) {
            self._sliderElement.slider( 'option', 'values', values );
            self._setSliderLabelDisplayValue();
        };

        /**
         * Move slider forward
         *
         * @return {Void}
         */
        $scope.moveSliderForward = function() {
            self._moveSliderByStep( true );
        };

        /**
         * Move slider backwards
         *
         * @return {Void}
         */
        $scope.moveSliderBackward = function() {
            self._moveSliderByStep( false );
        };

        /**
         * Move slider by step size
         *
         * @param {boolean} isForward - boolean indicating if forward\backward
         * @return {Void}
         */
        self._moveSliderByStep = function( isForward ) {
            var currentVal = self._sliderElement.slider( 'option', 'value' );
            var stepVal = self._sliderElement.slider( 'option', 'step' );
            var minVal = self._sliderElement.slider( 'option', 'min' );
            var maxVal = self._sliderElement.slider( 'option', 'max' );

            var newVal = null;

            if( isForward ) {
                newVal = currentVal + stepVal;
            } else {
                newVal = currentVal - stepVal;
            }

            if( newVal <= maxVal && newVal >= minVal ) {
                self._sliderElement.slider( 'option', 'value', newVal );
                $scope.prop.dbValue[ 0 ].sliderOption.value = newVal;
            }
            self._setSliderLabelDisplayValue();
        };

        /**
         * Build slider ui
         *
         * @return {Void}
         */
        self._buildSliderUI = function() {
            var options = $scope.prop.dbValue[ 0 ].sliderOption;
            options.slide = self._handleSliderSlideEvent;
            options.change = self._handleSliderChangeEvent;
            options.start = self._handleSliderStartEvent;
            options.stop = self._handleSliderStopEvent;
            options.create = self._handleSliderCreateEvent;
            self._sliderElement.slider( options );
        };

        /**
         * Slider changed event - set value
         */
        function setSliderValue( eventAction, ui ) {
            $timeout( function() {
                $scope.prop.dbValue[ 0 ].sliderOption.value = ui.value;
                $scope.prop.dbValue[ 0 ].sliderOption.values = ui.values;
                self._performAction( eventAction );
            }, 0 );
        }

        /**
         * Slider changed event handler
         *
         * @param {Object} event - event object
         * @param {Object} ui - object containing new slider values
         *
         * @return {Void}
         */
        self._handleSliderChangeEvent = function( event, ui ) {
            var eventAction = $scope.prop.dbValue[ 0 ].sliderChangeEventAction;
            if( eventAction ) {
                if( $scope.prop.dbValue[ 0 ].excludeZeroRange && ui && ui.values && ui.values.length > 1 && ui.values[0] === ui.values[1] ) {
                    var isLeftHandle = ui.handleIndex === 0;
                    if( isLeftHandle ) {
                        ui.value -= $scope.prop.dbValue[ 0 ].sliderOption.step;
                        ui.values[0] = ui.value;
                    } else {
                        ui.value += $scope.prop.dbValue[ 0 ].sliderOption.step;
                        ui.values[1] = ui.value;
                    }
                }
                setSliderValue( eventAction, ui );
            }
        };

        /**
         * Slider start event handler
         *
         * @param {Object} event - event object
         * @param {Object} ui - object containing new slider values
         *
         * @return {Void}
         */
        self._handleSliderStartEvent = function( event, ui ) {
            var eventAction = $scope.prop.dbValue[ 0 ].sliderStartEventAction;
            if( eventAction ) {
                $timeout( function() {
                    $scope.prop.dbValue[ 0 ].sliderOption.value = ui.value;
                    self._performAction( eventAction );
                }, 0 );
            }
        };

        /**
         * Slider slide event handler
         *
         * @param {Object} event - event object
         * @param {Object} ui - object containing new slider values
         *
         * @return {Void}
         */
        self._handleSliderSlideEvent = function( event, ui ) {
            var eventAction = $scope.prop.dbValue[ 0 ].sliderSlideEventAction;
            if( eventAction ) {
                setSliderValue( eventAction, ui );
            }
        };

        /**
         * Slider stop event handler
         *
         * @param {Object} event - event object
         * @param {Object} ui - object containing new slider values
         *
         * @return {Void}
         */
        self._handleSliderStopEvent = function( event, ui ) {
            var eventAction = $scope.prop.dbValue[ 0 ].sliderStopEventAction;
            if( eventAction ) {
                $timeout( function() {
                    $scope.prop.dbValue[ 0 ].sliderOption.value = ui.value;
                    self._performAction( eventAction );
                }, 0 );
            }
        };

        /**
         * Slider create event handler
         *
         * @return {Void}
         */
        self._handleSliderCreateEvent = function() {
            var eventAction = $scope.prop.dbValue[ 0 ].sliderCreateEventAction;

            if( eventAction ) {
                self._performAction( eventAction );
            }
        };

        /**
         * Run the action
         *
         * @param {Object} action - action to be performed
         *
         * @return {Void}
         */
        self._performAction = function( action ) {
            if( action !== null ) {
                self._setSliderLabelDisplayValue();
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, action, $scope );
            }
        };

        /**
         * Set the slider value
         *
         * @return {Void}
         */
        self._applySliderValue = function() {
            var currentVal = self._sliderElement.slider( 'option', 'value' );
            var newVal = $scope.prop.dbValue[ 0 ].sliderOption.value;
            if( newVal !== currentVal ) {
                $scope.setSliderValue( newVal );
            }
        };

        /**
         * Set the slider value
         *
         * @return {Void}
         */
        self._applySliderValues = function() {
            var currentVal = self._sliderElement.slider( 'option', 'values' );
            var newVal = $scope.prop.dbValue[ 0 ].sliderOption.values;
            if( newVal[ 0 ] !== currentVal[ 0 ] || newVal[ 1 ] !== currentVal[ 1 ] ) {
                $scope.setSliderValues( newVal );
            }
        };

        self._buildSliderUI();

        if( $scope.prop.dbValue[ 0 ].sliderOption.range !== true ) {
            $scope.$watch( 'prop.dbValue[0].sliderOption.value', self._applySliderValue );
        } else {
            $scope.$watch( 'prop.dbValue[0].sliderOption.values', self._applySliderValues );
        }

        $scope.$on( '$destroy', function() {
            $scope.prop = null;
            $element.remove();
            $element.empty();
        } );
    }
] );
