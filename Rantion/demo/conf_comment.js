/**
 * 
 * @NApiVersion 2.0
 * @NModuleScope Public
 */

define([],

function() {

    function XmlConfi() {
      var xml_string = '<?xml version="1.0"?>'+
      '<?mso-application progid="Excel.Sheet"?>'+
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'+
       'xmlns:o="urn:schemas-microsoft-com:office:office"'+
       'xmlns:x="urn:schemas-microsoft-com:office:excel"'+
       'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"'+
       'xmlns:html="http://www.w3.org/TR/REC-html40">'+
       '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">'+
       '<Author>xbany</Author>'+
        '<LastAuthor>xbany</LastAuthor>'+
        '<Created>2020-06-17T06:21:55Z</Created>'+
        '<Version>16.00</Version>'+
       '</DocumentProperties>'+
       '<OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">'+
        '<AllowPNG/>'+
       '</OfficeDocumentSettings>'+
       '<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">'+
        '<WindowHeight>8880</WindowHeight>'+
        '<WindowWidth>20490</WindowWidth>'+
        '<WindowTopX>0</WindowTopX>'+
        '<WindowTopY>0</WindowTopY>'+
        '<ProtectStructure>False</ProtectStructure>'+
        '<ProtectWindows>False</ProtectWindows>'+
       '</ExcelWorkbook>'+
       '<Styles>'+
        '<Style ss:ID="Default" ss:Name="Normal">'+
         '<Alignment ss:Vertical="Center"/>'+
         '<Borders/>'+
         '<Font ss:FontName="等线" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>'+
         '<Interior/>'+
         '<NumberFormat/>'+
         '<Protection/>'+
        '</Style>'+
       '</Styles>'+
       '<Worksheet ss:Name="Sheet1">'+
        '<Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="3" x:FullColumns="1"'+
         'x:FullRows="1" ss:DefaultColumnWidth="54" ss:DefaultRowHeight="14.25">'+
         '<Row ss:AutoFitHeight="0">'+
          '<Cell><Data ss:Type="String">1去</Data></Cell>'+
         '</Row>'+
        '</Table>'+
        '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">'+
         '<PageSetup>'+
          '<Header x:Margin="0.3"/>'+
          '<Footer x:Margin="0.3"/>'+
          '<PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>'+
         '</PageSetup>'+
         '<Unsynced/>'+
         '<Selected/>'+
         '<Panes>'+
          '<Pane>'+
           '<Number>3</Number>'+
           '<ActiveCol>7</ActiveCol>'+
          '</Pane>'+
         '</Panes>'+
         '<ProtectObjects>False</ProtectObjects>'+
         '<ProtectScenarios>False</ProtectScenarios>'+
        '</WorksheetOptions>'+
       '</Worksheet>'+
      '</Workbook>'
      
        return xml_string;
    }


  
    
    return {
        XmlConfi: XmlConfi
    };

});