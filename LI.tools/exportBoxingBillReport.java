public void exportBoxingBillReport(AllocationMasterBoxingReportDto boxingReportDto, HttpServletResponse response) throws Exception {
    //空字符转换
    CommonUtil.setNullFieldsAsEmpty(boxingReportDto);
    Map<String, Object> returnMap = CommonUtil.objectToMap(boxingReportDto);
    List<Map<String, Object>> airDataDetails = new ArrayList<>();
    List<Map<String, Object>> seaDataDetails = new ArrayList<>();
    AllocationBoxingReportDto cacheDto = new AllocationBoxingReportDto();
    for (int i = 0; i < boxingReportDto.getAir().size(); i++) {
        AllocationBoxingReportDto dto = boxingReportDto.getAir().get(i);
        CommonUtil.setNullFieldsAsEmpty(dto);
        if (dto.getBoxNo().equals(cacheDto.getBoxNo())) {
            dto.setVolume(cacheDto.getVolume());
            dto.setChargeWeight(cacheDto.getChargeWeight());
        } else {
            int position = i + 15;
            //I15*J15*K15/6000  I15*J15*K15/1000000
            //公式生成
            dto.setVolume("I" + position + "*J" + position + "*K" + position + "/1000000");
            dto.setChargeWeight("I" + position + "*J" + position + "*K" + position + "/6000");
            cacheDto = dto;
        }
        airDataDetails.add(CommonUtil.objectToMap(dto));
    }
    cacheDto = new AllocationBoxingReportDto();
    for (int i = 0; i < boxingReportDto.getSea().size(); i++) {
        AllocationBoxingReportDto dto = boxingReportDto.getSea().get(i);
        CommonUtil.setNullFieldsAsEmpty(dto);
        int position = i + 15;
        // sumQty D15*E15、sumWeight E15*F15、volume G15*H15*I15/1000000、sumVolume E15*L15、chargeWeight G15*H15*I15/6000、sumChargeWeight E15*N15
        if (dto.getBoxNo().equals(cacheDto.getBoxNo())) {
            dto.setSumWeight(cacheDto.getSumWeight());
            dto.setVolume(cacheDto.getVolume());
            dto.setSumVolume(cacheDto.getSumVolume());
            dto.setChargeWeight(cacheDto.getChargeWeight());
            dto.setSumChargeWeight(cacheDto.getSumChargeWeight());
        } else {
            //公式生成
            dto.setSumWeight("E" + position + "*F" + position);
            dto.setVolume("G" + position + "*H" + position + "*I" + position + "/1000000");
            dto.setSumVolume("E" + position + "*L" + position);
            dto.setChargeWeight("G" + position + "*H" + position + "*I" + position + "/6000");
            dto.setSumChargeWeight("E" + position + "*N" + position);
            cacheDto = dto;
        }
        dto.setSumQty("D" + position + "*E" + position);
        seaDataDetails.add(CommonUtil.objectToMap(dto));
    }
    returnMap.put("airData", airDataDetails);
    returnMap.put("seaData", seaDataDetails);
    TemplateExportParams templateExportParams = new TemplateExportParams("static/template/调拨单装箱单模板.xlsx", true);
    Workbook workbook = ExcelExportUtil.exportExcel(templateExportParams, returnMap);
    String codedFileName = StringUtils.isNotBlank(boxingReportDto.getAono()) ? boxingReportDto.getAono() : "装箱单";
    String HSSF = ".xls";
    String XSSF = ".xlsx";
    BaseFormulaEvaluator formulaEvaluator;
    int[] seaFormula = {9, 10, 11, 12, 13, 14};
    int[] airFormula = {11, 12};
    if (workbook instanceof HSSFWorkbook) {
        codedFileName += HSSF;
        formulaEvaluator = new HSSFFormulaEvaluator((HSSFWorkbook) workbook);
    } else {
        codedFileName += XSSF;
        formulaEvaluator = new XSSFFormulaEvaluator((XSSFWorkbook) workbook);
    }
    workbook.getSheetAt(0).forEach(x -> {
        if (x.getRowNum() != 0 && x.getRowNum() < 14 + seaDataDetails.size() && x.getRowNum() > 13) {
            for (int i : seaFormula) {
                Cell cell = x.getCell(i);
                if (cell != null) {
                    cell.setCellFormula(cell.getStringCellValue());
                    //公式计算
                    formulaEvaluator.evaluateFormulaCell(x.getCell(i));
                }
            }
        }
    });
    workbook.getSheetAt(1).forEach(x -> {
        if (x.getRowNum() != 0 && x.getRowNum() < 14 + airDataDetails.size() && x.getRowNum() > 13) {
            for (int i : airFormula) {
                Cell cell = x.getCell(i);
                if (cell != null) {
                    cell.setCellFormula(cell.getStringCellValue());
                    //公式计算
                    formulaEvaluator.evaluateFormulaCell(x.getCell(i));
                }
            }
        }
    });
    Map<Integer, int[]> seaMergeMap = new HashMap<>();
    int[] seaInts = {0, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14};
    for (int i : seaInts) {
        seaMergeMap.put(i, seaInts);
    }
    //合并单元格
    BasePoiMergeCellUtil.mergeCells(workbook.getSheetAt(0), seaMergeMap, 14);
    Map<Integer, int[]> airMergeMap = new HashMap<>();
    int[] airInts = {0, 7, 8, 9, 10, 11, 12};
    for (int i : airInts) {
        airMergeMap.put(i, airInts);
    }
    //合并单元格
    BasePoiMergeCellUtil.mergeCells(workbook.getSheetAt(1), airMergeMap, 14);
    response.setContentType("application/vnd.ms-excel;chartset=utf-8");
    response.setHeader("content-disposition", "attachment;filename=" + URLEncoder.encode(codedFileName, "UTF-8"));
    ServletOutputStream out = response.getOutputStream();
    workbook.write(out);
    out.flush();
}