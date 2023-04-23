/**
 * Plugin to Fix Table Size - prevent auto adjust 
 */
/*global
 CKEDITOR
 */
CKEDITOR.plugins.add( 'rmFixTableSize',
{
    init: function( editor )
    {
        CKEDITOR.on('dialogDefinition', function(event) {
            var dialogName = event.data.name;
            var dialogDefinition = event.data.definition;
            if (dialogName == 'table') {
                var advTab = dialogDefinition.getContents( 'advanced' );
                if( advTab ) {
                      advTab.get('advStyles')['default'] = advTab.get('advStyles')['default'] 
                      + 'table-layout:fixed !important; word-break:break-all; overflow-wrap: break-word;';
                }
                var infoTab = dialogDefinition.getContents('info');
                if( infoTab ) {
                    infoTab.get("cmbAlign")['default'] = "center";
              }
            }
        });

        // React to the insertElement event.
        // Wrap table in figure element
        editor.on('insertElement', function(event) {
            if (event.data.getName() != 'table') {
                return;
            }

            // Create a new figure element to use as a wrapper.
            var figure = new CKEDITOR.dom.element('figure').addClass('table');

            // Append the original element to the new wrapper.
            event.data.appendTo(figure);

            // Replace the original element with the wrapper.
            event.data = figure;
        }, null, null, 1);

        editor.on('afterPasteFromWord', function(eventData) {
            if(eventData && eventData.data && eventData.data.dataValue) {
                var div = document.createElement('div');
                div.innerHTML = eventData.data.dataValue;
                var tables = div.getElementsByTagName('table');
                for (let index = 0; index < tables.length; index++) {
                    const table = tables[index];
                    var figure = document.createElement('figure');
                    figure.className = 'table';
                    figure.innerHTML = table.outerHTML;
                    table.outerHTML = figure.outerHTML;
                }
                eventData.data.dataValue = div.innerHTML;
            }
        }, null, null, 1);
    }
} );
