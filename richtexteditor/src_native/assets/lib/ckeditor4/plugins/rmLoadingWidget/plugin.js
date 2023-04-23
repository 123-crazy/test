/*global
 CKEDITOR
 */
 CKEDITOR.plugins
 .add(
     'rmLoadingWidget', {
         requires: 'widget',

         init: function( editor ) {

             editor.widgets
                 .add( 'rmLoadingWidget', {

                    template: '<loading id="" class="requirement">' +
                        '<h3></h3>' +
                        '<span></span>' +
                        '</loading>',

                    editables: {
                        marker: {
                            selector: '.requirement'
                        }
                    },
                    allowedContent: 'loading(!requirement); h2[*]{*}(*); span[*]{*}(*)',

                    requiredContent: 'loading',
                    upcast: function( element ) {
                        return element.name === 'loading';
                    }
                });
            editor.widgets.on( 'instanceCreated',
                function( event ) {
                    if( event.data.name === 'rmLoadingWidget') {
                        var curWidget = event.data.element.$;
                        var objectString = curWidget.getAttribute('object_string');
                        var h3 = document.createElement('h3');
                        h3.innerHTML = objectString;
                        var span = document.createElement('span');
                        span.innerHTML = 'Loading...';
                        curWidget.appendChild(h3);
                        curWidget.appendChild(span);
                    }
                });
        }
    } );
