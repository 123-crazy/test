// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgControllers.awPropertyArrayValController}
 *
 * @module js/aw.property.array.val.controller
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/uwPropertyService';
import 'js/uwSupportService';
import 'js/localeService';
import ariaList from 'js/ariaList';

/**
 * Controller for {@link NgElementDirectives.aw-property-array-val} directive.
 *
 * @member awPropertyArrayValController
 * @memberof NgControllers
 */
app.controller( 'awPropertyArrayValController', [
    '$scope',
    '$element',
    'uwPropertyService',
    'uwSupportService',
    'localeService',
    function( $scope, $element, uwPropertySvc, uwSupportSvc, localeSvc ) {
        if( !$scope.prop ) {
            return;
        }

        var self = this;
        let list = null;

        /**
         * Clear edit widget after adding the value to the array.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {String} type - Data type
         * @param {String} hint - rendering hint
         */
        self.clearWidget = function( type, hint ) {
            if( $scope && $scope.dummyProp && $scope.dummyProp.hasLov ) {
                // reset the dbOriginalValue on the dummy input widget
                $scope.dummyProp.dbOriginalValue = $scope.prop.dbOriginalValue;
            }
            switch ( type ) {
                case 'STRINGARRAY':
                case 'INTEGERARRAY':
                case 'DOUBLEARRAY':
                case 'OBJECTARRAY':
                    $scope.dummyProp.dbValue = null;
                    $scope.dummyProp.uiValue = null;
                    $scope.dummyProp.dbValues = [];
                    $scope.dummyProp.displayValues = [];
                    break;
                case 'DATEARRAY':
                    $scope.dummyProp.dbValue = null;
                    $scope.dummyProp.uiValue = null;
                    $scope.dummyProp.dateApi.dateValue = null;
                    $scope.dummyProp.dateApi.timeValue = null;
                    break;
                case 'BOOLEANARRAY':
                    switch ( hint ) {
                        case 'radiobutton':
                            $scope.dummyProp.dbValue = null;
                            $scope.dummyProp.uiValue = null;
                            break;
                        default:
                            break;
                    }
                    break;
                default:
                    break;
            }
        };

        /**
         * To set the array text place holder
         *
         * @param {String} bundleKey - property's bundleKey
         */
        var setArrayTextPlaceHolder = function( bundleKey ) {
            localeSvc.getTextPromise().then( function( localTextBundle ) {
                if( $scope.dummyProp.isRequired && !$scope.dummyProp.propertyRequiredText ) {
                    $scope.dummyProp.propertyRequiredText = localTextBundle[ bundleKey ];
                }
            } );
        };

        /**
         * Change required flag of editable widget which is data bound to dummy prop based on the values added to
         * array property. FALSE if property's dbValue is not empty
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {String} isRequired - property's isRequired flag
         * @param {String} propDbValue - dbValue of property to check if values exist for a required property
         */
        self.changeDummyPropRequired = function( isRequired, propDbValue ) {
            if( !isRequired ) {
                return;
            }

            if( propDbValue && propDbValue.length > 0 ) {
                $scope.dummyProp.isRequired = false;
                if( !$scope.dummyProp.propertyRequiredText ) {
                    $scope.dummyProp.propertyRequiredText = '';
                }
            } else {
                $scope.dummyProp.isRequired = isRequired;
                if( $scope.dummyProp.isRequired && !$scope.dummyProp.propertyRequiredText ) {
                    setArrayTextPlaceHolder( 'REQUIRED_TEXT' );
                }
            }
        };

        /**
         * Check max array length and disable the ability to add values to array once maximum value is reached and
         * also modify place holder text
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {String} maxArrayLength - property's max array length
         * @param {String} propDbValue - dbValue of property to check if values exist for a required property
         * @param {String} isEnabled - property's isEnabled flag
         * @param {String} placeHolderText - place holder text of array widget
         */
        self.checkMaxArrayLength = function( maxArrayLength, propDbValue, isEnabled, placeHolderText ) {
            if( maxArrayLength === null || maxArrayLength === undefined || maxArrayLength === -1 ) {
                return;
            }

            if( propDbValue && propDbValue.length >= maxArrayLength ) {
                $scope.dummyProp.isEnabled = false;
                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    var maxArrayMsg = localTextBundle.MAX_ARRAY_LENGTH;
                    maxArrayMsg = maxArrayMsg.replace( '{0}', maxArrayLength );

                    $scope.dummyProp.propertyRequiredText = maxArrayMsg;
                } );
            } else {
                $scope.dummyProp.isEnabled = isEnabled;
                $scope.dummyProp.propertyRequiredText = placeHolderText;
            }
        };
        $scope.prop.editArrayInlineMode = false;
        $scope.prop.dirty = false;

        // Use jquery extend to dep copy $scope.prop into dummyProp (.clone was not copying all properties like lovApi)
        $scope.dummyProp = $.extend( true, {}, $scope.prop );
        $scope.dummyProp.overlayType = 'dummyArrayProp';

        // PR9041268 - If Array Property is Marked "Copy as Original" then Revise and SaveAs Panel still shows as Required property
        self.changeDummyPropRequired( $scope.prop.isRequired, $scope.prop.dbValue );
        if( $scope.prop && $scope.prop.displayValsModel && $scope.prop.displayValsModel.length > 0 ) {
            setArrayTextPlaceHolder( 'ARRAY_PLACEHOLDER_TEXT' );
        }

        self.clearWidget( $scope.prop.type, $scope.prop.renderingHint );

        /**
         * Check to see if the dbValue is a valid value to add it to array.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {ViewModelProperty} viewModelProperty - ViewModelProperty object that will be updated.
         * @return {Boolean} True if db value is valid
         */
        self.isValidArrayValue = function( viewModelProperty ) {
            var isValid = false;

            if( viewModelProperty && viewModelProperty.dbValue !== '' && viewModelProperty.dbValue !== null &&
                viewModelProperty.dbValue !== undefined ) {
                if( viewModelProperty.type === 'INTEGERARRAY' || viewModelProperty.type === 'DOUBLEARRAY' ||
                    viewModelProperty.type === 'DATEARRAY' ) {
                    if( isFinite( viewModelProperty.dbValue ) ) {
                        viewModelProperty.dbValue = Number( viewModelProperty.dbValue );
                        isValid = true;
                    }
                } else if( viewModelProperty.type === 'BOOLEANARRAY' ) {
                    isValid = _.isBoolean( viewModelProperty.dbValue );
                } else {
                    isValid = true;
                }
            }

            return isValid;
        };

        /**
         * Check if valid to add based on arrayLength
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {ViewModelProperty} viewModelProperty - ViewModelProperty object
         * @return {Boolean} TRUE if arrayLength not defined OR if defined number of values should be less than or
         *         equal to array length, FALSE otherwise
         */
        self.validToAdd = function( viewModelProperty ) {
            if( viewModelProperty ) {
                if( viewModelProperty.arrayLength === null || viewModelProperty.arrayLength === undefined ||
                    viewModelProperty.arrayLength === -1 ) {
                    return true;
                }

                if( viewModelProperty.dbValue.length < viewModelProperty.arrayLength ) {
                    return true;
                }
            }

            return false;
        };

        /**
         * Trigger "dirty" via $setDirty() so that it sets $dirty flag in angular form validation
         */
        self.setFormDirty = function() {
            var inputElem = $element.find( 'input' );
            if( inputElem && inputElem.length === 0 ) {
                inputElem = $element.find( 'textarea' );
            }

            if( inputElem && inputElem.length > 0 ) {
                var ngModelCtrl = $( inputElem[ 0 ] ).controller( 'ngModel' );
                if( ngModelCtrl ) {
                    ngModelCtrl.$setDirty();
                }
            }
        };

        /**
         * Adds value to array widget, clears the edit widget after adding and marks the widget as dirty.
         *
         * @memberof NgControllers.awPropertyArrayValController
         */
        $scope.dummyProp.updateArray = function() {
            // propagate error from dummy prop to $scope.prop
            $scope.prop.error = $scope.dummyProp.error;

            if( self.isValidArrayValue( $scope.dummyProp ) && !$scope.prop.error && self.validToAdd( $scope.prop ) ) {
                // If dummyProp.dbValue is an array e.g. in case of addObjectReference when multiple objects are selected,
                // every object individually should be pushed into $scope.prop.dbValue rather than as an array.
                if( _.isArray( $scope.dummyProp.dbValue ) ) {
                    _.forEach( $scope.dummyProp.dbValue, function( value ) {
                        if( value ) {
                            $scope.prop.dbValue.push( value );
                        }
                    } );
                } else {
                    $scope.prop.dbValue.push( $scope.dummyProp.dbValue );
                }

                // For LOVs update display values with LOV entry's uiValue
                if( $scope.prop.hasLov ) {
                    $scope.prop.uiValue = $scope.dummyProp.uiValue;
                    $scope.prop.displayValues.push( $scope.prop.uiValue );

                    if( $scope.prop.isArray ) {
                        $scope.prop.displayValsModel = $scope.prop.displayValsModel || [];
                        $scope.prop.displayValsModel.push( {
                            displayValue: $scope.prop.uiValue,
                            selected: false
                        } );
                    }
                }

                uwPropertySvc.updateViewModelProperty( $scope.prop );

                self.changeDummyPropRequired( $scope.prop.isRequired, $scope.prop.dbValue );
                self.clearWidget( $scope.prop.type, $scope.prop.renderingHint );

                self.checkMaxArrayLength( $scope.prop.arrayLength, $scope.prop.dbValue, $scope.prop.isEnabled,
                    $scope.prop.propertyRequiredText );

                $scope.prop.dirty = true;
                runValidation();
            }
        };

        /**
         * Force validation of any nested ng-models (at least ones using aw-validator)
         *
         * Angular will only trigger validation when the $viewValue changes, which will not happen for array properties
         */
        const runValidation = () => {
            $scope.$broadcast( 'forceValidate' );
        };

        /**
         * Selection of the array list is handled. First click on the cell selects the list item and next click on
         * the cell will embed edit widget into the cell so that user should be able to replace the value.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {DOMEvent} $event - Event object
         * @param {Number} $index - selected index of the list.
         * @param {Object} currentTarget - selected div on the list
         */
        $scope.selectAndEdit = function( $event, $index, currentTarget ) {
            var jqParentElement = currentTarget || $event.currentTarget;
            if( !$scope.prop.editArrayInlineMode ) {
                // if the array element is already selected, enter edit mode; unless it's an objectarray
                // also, inline lov editing in arrays regressed at some pt. disabling for now and checking
                // for a defect...
                if( $scope.prop.displayValsModel[ $index ].selected && $scope.prop.type !== 'OBJECTARRAY' && !$scope.prop.hasLov ) {
                    $scope.prop.autofocus = true;

                    $scope.prop.currArrayDbValue = $scope.prop.dbValue.slice( 0 );
                    $scope.prop.dbValue = $scope.prop.currArrayDbValue[ $index ];
                    $scope.prop.uiValue = $scope.prop.displayValues[ $index ];
                    $scope.prop.$index = $index;

                    uwSupportSvc.includeArrayPropertyValue( jqParentElement, jqParentElement, $scope.prop );

                    $scope.prop.editArrayInlineMode = true;
                } else {
                    for( var i = 0; i < $scope.prop.displayValsModel.length; i++ ) {
                        if( i === $index ) {
                            $scope.prop.displayValsModel[ i ].selected = true;
                            $scope.lastSelected = $scope.prop.displayValsModel[ $index ];
                        } else {
                            $scope.prop.displayValsModel[ i ].selected = false;
                        }
                    }
                }
            }
            $event.stopPropagation();
        };

        /**
         * Replaces value of array cell item and inserts non-edit widget with updated value.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {DOMEvent} $event - Event object
         * @param {Boolean} skipUpdate - TRUE if there is no change in value then don't call
         *            'updateViewModelProperty'.
         */
        $scope.prop.updateArray = function( $event, skipUpdate ) {
            if( self.isValidArrayValue( $scope.prop ) && ( !$scope.prop.error || $scope.prop.hasServerValidationError ) ) {
                if( $scope.prop.currArrayDbValue ) {
                    $scope.prop.currArrayDbValue.splice( $scope.prop.$index, 1, $scope.prop.dbValue );
                }

                $scope.prop.dirty = true;
                $scope.prop.dbValue = $scope.prop.currArrayDbValue.slice( 0 );

                // For LOVs update display values with LOV entry's uiValue
                if( $scope.prop.hasLov ) {
                    $scope.prop.displayValues.splice( $scope.prop.$index, 1, $scope.prop.uiValue );

                    if( $scope.prop.isArray ) {
                        $scope.prop.displayValsModel = $scope.prop.displayValsModel || [];
                        $scope.prop.displayValsModel.splice( $scope.prop.$index, 1, {
                            displayValue: $scope.prop.uiValue,
                            selected: false
                        } );
                    }
                }

                if( !skipUpdate ) {
                    uwPropertySvc.updateViewModelProperty( $scope.prop );
                }
            } else if( $scope.prop.dbValue === '' || $scope.prop.dbValue === null || $scope.prop.dbValue === undefined ) {
                /**
                 * Empty values are not allowed while replacing existing value in array. Revert it to previous value
                 * if empty value is entered by user.
                 */
                $scope.prop.dbValue = $scope.prop.currArrayDbValue.slice( 0 );
            }

            $scope.prop.editArrayInlineMode = false;
            self.insertNonEdit( $event );
        };

        /**
         * Inserts non-edit widget with updated value and destroys any previous scopes.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {DOMEvent} $event - Event object
         */
        self.insertNonEdit = function( $event ) {
            if( $event ) {
                $scope.prop.autofocus = false;
                var inputElement = $event;

                if( $event.currentTarget ) {
                    inputElement = $event.currentTarget;
                }

                var jqParentElement = $( inputElement ).closest( '.aw-state-selected .aw-jswidgets-arrayValue' );

                var previousScopeElement = $( jqParentElement ).find( '.aw-jswidgets-property' );

                // destroying scope of previous element
                if( previousScopeElement ) {
                    var contrScope = previousScopeElement.scope();
                    if( contrScope ) {
                        contrScope.$destroy();
                        previousScopeElement.remove();
                    }
                }

                uwSupportSvc.insertNgProp( jqParentElement,
                    '<div ng-click="selectAndEdit($event, $index)">{{displayNode.displayValue}}</div>', $scope.prop );
                //focus on closest listItem once value saved.
                let liContainer = $element[0].querySelector( 'li[tabindex="0"][role="option"]' );
                if( liContainer ) {
                    liContainer.focus();
                }
            }
        };

        /**
         * sets the focus to next Element or previous element based on the action.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {Number} index - index of the cell list item which needs to be moved.
         * @param {String} action - action to move up or down.
         */
        self.setupFocusOnListItem = function( index, action ) {
            //manage focus & tabindex on moveUp/moveDown Command.
            let li = $element[0].querySelector( 'li.aw-state-selected' );
            if( li ) {
                li.setAttribute( 'tabindex', -1 );
                $scope.prop.displayValsModel[ index ].selected = false;
                let siblingToFocus;
                if( action === 'moveUp' ) {
                    siblingToFocus = li.previousElementSibling;
                } else if( action === 'moveDown' ) {
                    siblingToFocus = li.nextElementSibling;
                }
                if( siblingToFocus ) {
                    siblingToFocus.focus();
                    siblingToFocus.setAttribute( 'tabindex', 0 );
                } else {
                    //if no focusable sibling focus on current selected
                    li.focus();
                    li.setAttribute( 'tabindex', 0 );
                }
            }
        };

        /**
         * Used to move UP value in the array cell list based on the index.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {Number} $index - index of the cell list item which needs to be moved.
         */
        $scope.moveUp = function( $index ) {
            if( $index > 0 ) {
                var currDbVal = $scope.prop.dbValue[ $index ];
                var currDisplayVal = $scope.prop.displayValues[ $index ];
                var currDisplayValModel = $scope.prop.displayValsModel[ $index ];

                $scope.prop.dbValue.splice( $index, 1 );
                $scope.prop.dbValue.splice( $index - 1, 0, currDbVal );

                $scope.prop.displayValues.splice( $index, 1 );
                $scope.prop.displayValues.splice( $index - 1, 0, currDisplayVal );

                $scope.prop.displayValsModel.splice( $index, 1 );
                $scope.prop.displayValsModel.splice( $index - 1, 0, currDisplayValModel );

                $scope.prop.dirty = true;
                self.setFormDirty();
                uwPropertySvc.updateViewModelProperty( $scope.prop );

                self.setupFocusOnListItem( $index, 'moveUp' );
            }
        };

        /**
         * Used to move DOWN value in the array cell list based on the index.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {Number} $index - index of the cell list item which needs to be moved.
         */
        $scope.moveDown = function( $index ) {
            if( $index <= $scope.prop.displayValsModel.length - 1 ) {
                var currDbVal = $scope.prop.dbValue[ $index ];
                var currDisplayVal = $scope.prop.displayValues[ $index ];
                var currDisplayValModel = $scope.prop.displayValsModel[ $index ];

                $scope.prop.dbValue.splice( $index, 1 );
                $scope.prop.dbValue.splice( $index + 1, 0, currDbVal );

                $scope.prop.displayValues.splice( $index, 1 );
                $scope.prop.displayValues.splice( $index + 1, 0, currDisplayVal );

                $scope.prop.displayValsModel.splice( $index, 1 );
                $scope.prop.displayValsModel.splice( $index + 1, 0, currDisplayValModel );

                $scope.prop.dirty = true;
                self.setFormDirty();
                uwPropertySvc.updateViewModelProperty( $scope.prop );

                self.setupFocusOnListItem( $index, 'moveDown' );
            }
        };

        /**
         * Removes the item from array cell list.
         *
         * @memberof NgControllers.awPropertyArrayValController
         *
         * @param {Number} $index - index of the cell list item which needs to be moved.
         */
        $scope.remove = function( $index ) {
            var removedVal = $scope.prop.dbValue[ $index ];
            $scope.prop.dbValue.splice( $index, 1 );

            if( $scope.prop.hasLov ) {
                $scope.prop.displayValues.splice( $index, 1 );

                if( $scope.prop.isArray ) {
                    $scope.prop.displayValsModel = $scope.prop.displayValsModel || [];
                    $scope.prop.displayValsModel.splice( $index, 1 );
                    // PR9041268 - Required Array property is removed from Widget then to add a place holder as Required
                    if( $scope.prop.displayValsModel && $scope.prop.displayValsModel.length === 0 ) {
                        if( $scope.prop.isRequired ) {
                            setArrayTextPlaceHolder( 'REQUIRED_TEXT' );
                        } else {
                            setArrayTextPlaceHolder( 'ARRAY_PLACEHOLDER_TEXT' );
                        }
                    }
                }
            }

            $scope.prop.dirty = true;
            self.setFormDirty();

            uwPropertySvc.updateViewModelProperty( $scope.prop );

            self.changeDummyPropRequired( $scope.prop.isRequired, $scope.prop.dbValue );
            self.checkMaxArrayLength( $scope.prop.arrayLength, $scope.prop.dbValue, $scope.prop.isEnabled,
                $scope.prop.propertyRequiredText );
            if( $scope.prop.hasLov && $scope.prop.isArray ) {
                /**
                 * Fire array value removed event so that it can trigger 'validateLOVValueSelections' SOA call
                 */
                eventBus.publish( $scope.prop.propertyName + '.arrayValueRemoved', {
                    index: $index,
                    dbValue: removedVal
                } );
            }

            //manage selection on element removal.
            //remove active tabindex,
            let liContainer = $element[0].querySelector( 'li[tabindex="0"][role="option"]' );
            if( liContainer ) {
                liContainer.setAttribute( 'tabIndex', '-1' );
            }
            //set tabIndex of parent UL to 0 since no active tabIndex left after removal
            let ul = $element[0].querySelector( '[role="listbox"]' );
            ul.setAttribute( 'tabIndex', '0' );
            //focus on input box once removed
            $element[0].querySelector( 'input,textarea' ).focus();
            runValidation();
        };


        let setupWCAG = () => {
            //WCAG keyboard handling
          list = new ariaList();
          let ul = $element[0].querySelector( '[role="listbox"]' );
          if( !ul ) { return; }

          var obj =  {
              apis: {
                  selectItem: ( event, selectedItem )=> {
                      $scope.$applyAsync( function() {
                        let currentIndex = $( selectedItem ).scope().$index;
                        let currentTarget = selectedItem.querySelector( '.aw-jswidgets-arrayValue div' );
                        $scope.selectAndEdit( event, currentIndex, currentTarget );
                      } );
                  }
              },
              setAriaAttributes: false,
              autoScroll: false,
              listSelector: '.aw-jswidgets-arrayValueCellListItem'
          };

          let childSelector = 'option';
          list.init( ul, obj, childSelector );
      };

      setupWCAG();

      $scope.$on( '$destroy', function() {
          if( list ) {
              list.clean();
          }
      } );
    }
] );
