CKEDITOR.dialog.add( 'dialogConnected', function ( editor ) {
    return {
        title: 'RAT WS',
        minWidth: 200,
        minHeight: 50,

        contents: [
            {
                id: 'tab-basic',
                label: 'Sessios Settings',
                elements: [
                    {
                        type: 'html',
                          html:'<h3>Do you want to disconnect the RAT Plugin for CKEditor?</h3>'
                    }
                ]
            }
        ],onOk: function(){
            $.ajax({
                url : CKEDITOR.RAT.WebServicePath+ '/EndRequirement',
                data :     {     
                            sessionId : CKEDITOR.RAT.ID
                        },
                type : 'POST',
                dataType : 'xml',
                success : function(xml) {
                    //console.log(xml);
                }
            });
            $.ajax({
                url : CKEDITOR.RAT.WebServicePath+ '/Disconnect',
                data :     {     
                            sessionId : CKEDITOR.RAT.ID,
                        },
                 async:true,
                type : 'POST',
                dataType : 'xml',
                success : function(xml) {
                    CKEDITOR.RAT = new Object();
                    editor.fire("RatDisconnected");
                },
                error : function(xhr, status) {
                    console.log('Error while connecting to Reuse API');
                    CKEDITOR.RAT = new Object();
                    editor.fire("RatDisconnected");
                }
            });

        }
    };
});
