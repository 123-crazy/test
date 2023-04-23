// Copyright (c) 2020 Siemens

/**
 * Definition for the 'aw-guidance-message' directive used to show guidance message.
 *
 * @module js/aw-guidance-message.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/messagingService';
import 'js/aw-icon.directive';
import 'js/aw-link.directive';
import 'js/localeService';
import _ from 'lodash';
import wcagSvc from 'js/wcagService';

/**
 * Definition for the 'aw-guidance-message' directive used to autofocus an element
 *
 * @example <aw-guidance-message></aw-guidance-message>
 *
 * @member aw-guidance-message
 * @memberof NgAttributeDirectives
 */
var _messageTypeStyle = {
    ERROR: 'guidance-container-type-error',
    WARNING: 'guidance-container-type-warning',
    INFO: 'guidance-container-type-information',
    SUCCESS: 'guidance-container-type-success'
};
var _iconId = {
    ERROR: 'indicatorCancelled',
    WARNING: 'indicatorWarning',
    INFO: 'indicatorInfo',
    SUCCESS: 'indicatorCompleted'
};
var _guidanceMessageType = {
    INFO: 'generalInfo',
    WARNING: 'warningInfo',
    ERROR: 'errorInfo',
    SUCCESS: 'successInfo'
};
/**
 * Evaluate message with its parameters
 *
 * @param {String} messageString - The message String.
 *
 * @param {String} messageParams - The message parameters.
 *
 * @return {String} Result string after applying passed parameters.
 */
function applyLinkParams( messageString, messageParams ) {
    var placeHolders = messageString.match( /\{@msgTxtLink[0-9]*\}/g );
    var resultString = messageString;
    if( placeHolders ) {
        for( var i in placeHolders ) {
            if( placeHolders.hasOwnProperty( i ) ) {
                var placeHolder = placeHolders[ i ];
                var index = placeHolder;
                index = _.trimStart( index, '{@msgTxtLink' );
                index = _.trimEnd( index, '}' );
                var replacementString = '<aw-link prop="' + messageParams[ index ].prop + '" action="' + messageParams[ index ].action + '"></aw-link>';
                resultString = resultString.replace( placeHolder, replacementString );
            }
        }
    }
    return '<span class="aw-guidance-messageText">' + resultString + '</span>';
}
app.directive( 'awGuidanceMessage', [ 'viewModelService', 'messagingService', 'localeService', '$compile', //
    function( viewModelSvc, messagingSvc, localeSvc, $compile ) {
        return {
            restrict: 'E',
            scope: {
                message: '@',
                bannerStyle: '@?',
                closable: '@?',
                showIcon: '@?',
                showType: '@?'
            },
            transclude: true,

            link: function( $scope, $element ) {
                if( $scope.message ) {
                    $scope.showMessage = true;
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    var guidanceMessage = messagingSvc.generateMessage( declViewModel, null, $scope.message, null );
                    var guidanceMessageText = applyLinkParams( guidanceMessage.localizedMessage, guidanceMessage.messageDefn.messageTextLinks );
                    var childScope = $scope.$new();
                    var guidanceMessageElem = $compile( guidanceMessageText )( childScope );
                    $element.find( '.aw-guidance-text' ).append( guidanceMessageElem );
                    $scope.messageType = guidanceMessage.messageDefn.messageType.toUpperCase();
                    var bannerStyleClass = $scope.bannerStyle !== 'false' ? 'guidance-container-banner' : 'guidance-container-fullWidth';
                    $scope.iconId = _iconId[ $scope.messageType ];
                    localeSvc.getLocalizedTextFromKey( 'UIMessages.' + _guidanceMessageType[ $scope.messageType ] ).then( result => $scope.messageTypeGuidance = result );
                    $scope.guidanceMessageClass = _messageTypeStyle[ $scope.messageType ] + ' ' + bannerStyleClass;
                    $scope.closeGuidanceMessage = function() {
                        $scope.showMessage = false;
                    };
                    $scope.handleKeyPress = function( event ) {
                        if ( wcagSvc.isValidKeyPress( event ) ) {
                            $scope.closeGuidanceMessage();
                        }
                    };
                }
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-guidance-message.directive.html'
        };
    }
] );
