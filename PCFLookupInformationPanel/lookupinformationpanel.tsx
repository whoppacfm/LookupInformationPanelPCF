//React
import React, { useState, useEffect } from 'react';
import * as ReactDOM from 'react-dom';

function showInformationPanel() {
    alert("info panel");
}

function LookupInformationControl(props:any) {

    class CFieldData {
        "logicalname":string;
        "type":string;
        "displaytext":string;
        "options":[];
        "showvalue":string;
    }
    
    class CSubgridData {
        data: Array<CFieldData>;
    }

    const [contentVisible, setContentVisible] = React.useState({ 
        visible: false
    });

    const [recordData, setRecordData] = React.useState({ 
        data: new Array<CFieldData>()
    });

    const [subgridData, setSubgridData] = React.useState({ 
        data: new Array<CSubgridData>()
    });


    //Get current record data
    //let currentFntityId = (props.context.mode as any).contextInfo.entityId;
    //let currentEntityTypeName = (props.context.mode as any).contextInfo.entityTypeName;
    //let currentEntityRecordName = (props.context.mode as any).contextInfo.entityRecordName;

    //Get currentcControl field value
    let lookupfield_currentValue = props.context.parameters.BoundLookupField.raw[0];
    let lookupfield_currentId = lookupfield_currentValue.id;
    let lookupfield_currentEntityType = lookupfield_currentValue.entityType;
    let lookupfield_currentRecordName = lookupfield_currentValue.name;

    //Get PCF Config
    let config_fields:Array<string> = [];
    let config_lists:string = "";

    if(props.context.parameters.Fields.raw!=null) {
        config_fields = props.context.parameters?.Fields?.raw.split(",");
    }

    if(props.context.parameters?.Lists?.raw!=null) {
        config_lists = props.context.parameters?.Lists?.raw;
    }

    //Load Data
    function loadSubgridData() {
        
        //[entityname],[lookupname],[fieldname1];[fieldnameN]
        
        // arr:[] = config_lists.split("/")
        
        //map
        //let entname = item[0];
        //..

        //subgridData, setSubgridData,  data: new Array<CSubgridData>()

    }

    function loadData() {
        let fieldsMetadata:Array<CFieldData> = new Array<CFieldData>();

		props.context.utils.getEntityMetadata(lookupfield_currentEntityType, config_fields).then(function(res:any) {
            
            let metaData = res.Attributes._collection;

            config_fields.map(function(cfieldname:string){
                let metaField = metaData[cfieldname];
                let fieldmd:CFieldData = new CFieldData();
                if(metaField!=null) {
                    fieldmd.displaytext=metaField._displayName != null ? metaField._displayName : "";
                    fieldmd.logicalname=cfieldname;
                    fieldmd.type = metaField._attributeTypeName; //"string", "lookup", "owner", "status", "datetime", "picklist", "integer", "decimal", "memo"
                    fieldmd.options = [];
                    fieldmd.showvalue="";
                    if(fieldmd.type=="picklist") {
                        //res.Attributes._collection.dev_picklist1.OptionSet["3543545"].text
                    }
                }
                else {
                    console.error("Field " + cfieldname + " does not exist");
                }

                fieldsMetadata.push(fieldmd);
            });

            props.context.webAPI.retrieveRecord(lookupfield_currentEntityType, lookupfield_currentId).then(function(res:any) {
                
                fieldsMetadata.map(function(metafield:CFieldData) {
                    if(res[metafield.logicalname]!=null) {
                        metafield.showvalue = String(res[metafield.logicalname]);
                    }
                });
                
                setRecordData({"data": fieldsMetadata});

            });
		});

    }
    
    //Init Panel Data    
    useEffect(() => {
        loadData();
    }, []);
    
    function onShow() {
        console.error("onShow");
        setContentVisible({visible:true});
    }

    function onHide() {
        console.error("onShow");
        setContentVisible({visible:false});
    }

    let initialValue = props.lookupvalue;
    let lookupInputStyle:any = {width:"70%", height:"10px", borderLeft:"45px solid transparent", borderRight:"45px solid transparent", borderTop:"10px solid aliceblue"};
    let contentStyle:any = {width:"800px", height:"800px", display:"none"};
    let itemFieldStyle:any = {float:"left", marginRight:"50px"};
    
    let trstyle = {width:"100%"};
    let tdstyle = {width:"50%"};

    if(contentVisible.visible) {
        contentStyle = {width:"800px", height:"800px", display:"block"};
    }

    //---TESTING---
    contentStyle = {width:"800px", height:"800px", display:"block"};
    //-------------

    debugger;

    let itemsTable = recordData.data.map((item:CFieldData) =>
        <>
            <tr style={trstyle}><td style={tdstyle}>{item.displaytext}</td><td style={tdstyle}>{item.showvalue}</td></tr>
        </>
    );

    return (
        <>
            <div onMouseEnter={onShow} onMouseLeave={onHide} style={lookupInputStyle}></div>
            <table>
                {itemsTable}
            </table>
        </>
    );
}

/*
private performLookupObjects(entityType: string, viewId: string, setSelected: (value: ComponentFramework.LookupValue, update?: boolean) => void): void {
    // Used cached values from lookup parameter to set options for lookupObjects API
    const lookupOptions = {
    defaultEntityType: entityType,
    defaultViewId: viewId,
    allowMultiSelect: false,
    entityTypes: [entityType],
    viewIds: [viewId]
    };
    
    this._context.utils.lookupObjects(lookupOptions).then((success) => {
        if (success && success.length > 0) {
        // Cache the necessary information for the newly selected entity lookup
        const selectedReference = success[0];
        const selectedLookupValue: ComponentFramework.LookupValue = {
            id: selectedReference.id,
            name: selectedReference.name,
            entityType: selectedReference.entityType
        };
        // Update the primary or secondary lookup property
        setSelected(selectedLookupValue);
        // Trigger a control update
        this._notifyOutputChanged();
    } else {
        setSelected({} as ComponentFramework.LookupValue);
    }
    }, (error) => {
        console.log(error);
    });
}
*/

export function Render(context:any, container:any, theobj:object) {
    ReactDOM.render(
            <div><LookupInformationControl context={context} theobj={theobj} /></div>
        , container
      );
}

