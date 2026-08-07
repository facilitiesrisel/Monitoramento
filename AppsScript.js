// =========================================================
//      SISTEMA AUTOMÁTICO - MONITORAMENTO RISEL COMBUSTÍVEIS
//               Versão: 2026-08-06.01 (RE-EMAIL & PDF FIX)
// =========================================================

const TEMPLATE_DOC_ID = '1QRywgVapwOMtVXyTkCbqpz9Ndkw9Jxy31v_-yvsU3jA'; 
const BOLA_PRETA_TEMPLATE_ID = '1NUrBlicrEUzAgUgyRmR4qp15WzDZod2taq4sZ1UyNnQ'; // Novo modelo Bola Preta
const OUTPUT_FOLDER_ID = '10dGRmYvBLwtAhigtY3Zru-yAxHAPzF9U';
const IMAGE_FOLDER_ID = '1QjcgNaMbyQECI5u_g1UAPW5ZySJ9dkJv'; 
const TICKETS_FOLDER_ID = '1Msu9YThHz8TSEvtwU-oUUgsqd4zZ93Gi'; // Pasta para Anexos de Chamados
const SHEET_NAME = 'Avaliação Direção';

// Lista de e-mails destinatários das avaliações e relatórios
const EMAIL_DESTINATARIOS_PRINCIPAIS = 'deny.goncalves@risel.com.br, wbreda@risel.com.br, rafael.ortega@risel.com.br, carlos.santos@risel.com.br, monitoramentopln@risel.com.br, felipe.assumpcao@risel.com.br';
const EMAIL_COPIA = ''; 
const EMAIL_TESTE_EXCLUSIVO = 'deny.goncalves@risel.com.br';

const PROCESSED_COLUMN_HEADER = 'PROCESSED_SCRIPT';
const IMG_WIDTH_PX = 360;  
const IMG_HEIGHT_PX = 320; 

// CORES IDENTIDADE RISEL
const COR_RISEL_VERDE = '#006633'; 
const COR_RISEL_LARANJA = '#F99D1C'; 
const COR_RISEL_AZUL = '#4A86E8'; 
const COR_FONTE_BRANCA = '#FFFFFF';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return ContentService.createTextOutput("Erro: Servidor ocupado. Tente novamente.");
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(data.sheetId);
    
    // --- LÓGICA PARA AVALIAÇÃO DE DIREÇÃO ---
    if (data.type === 'evaluation') {
      var sheet = ss.getSheetByName(SHEET_NAME);
      sheet.appendRow(data.row);
      SpreadsheetApp.flush(); 
      
      // Processa imagens na pasta padrão de avaliações
      processFiles(data.files, IMAGE_FOLDER_ID);
      
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var mappedData = {};
      
      headers.forEach((h, i) => {
        mappedData[String(h).trim()] = (data.row[i] !== undefined) ? data.row[i] : "";
      });
      
      try {
        enviarRelatorio(mappedData, null, null, data.files);
        var lastRow = sheet.getLastRow();
        var ctrlCol = ensureControlColumnIsReady(sheet);
        sheet.getRange(lastRow, ctrlCol).setValue("ENVIADO_AUTO");
      } catch (errEmail) {
        console.error("Erro no envio automático: " + errEmail.toString());
        try {
           MailApp.sendEmail({
             to: 'deny.goncalves@risel.com.br',
             subject: 'ERRO AO ENVIAR AVALIAÇÃO: ' + (mappedData['MOTORISTA'] || 'N/A'),
             name: 'Sistema de Monitoramento Risel',
             htmlBody: 'Houve um erro ao enviar a avaliação:<br><br><b>Mensagem:</b> ' + errEmail.message + '<br><b>Stack:</b> ' + String(errEmail.stack)
           });
        } catch(ex) {}
      }
      return ContentService.createTextOutput("OK");
    }

    if (data.type === 'resendEvaluationEmail') {
      var sheet = ss.getSheetByName(SHEET_NAME);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var targetRow = null;
      var targetId = String(data.id || "").trim();

      for (var i = 1; i < rows.length; i++) {
        if (targetId && String(rows[i][0]).trim() === targetId) {
          targetRow = rows[i];
          break;
        }
      }

      if (!targetRow && targetId.indexOf('ev-') === 0) {
        var idx = parseInt(targetId.replace('ev-', ''), 10);
        if (!isNaN(idx) && (idx + 1) < rows.length) {
          targetRow = rows[idx + 1];
        }
      }

      if (!targetRow && data.row) {
        targetRow = data.row;
      }

      if (targetRow) {
        var mappedData = {};
        headers.forEach((h, idx) => {
          mappedData[String(h).trim()] = (targetRow[idx] !== undefined) ? targetRow[idx] : "";
        });
        
        // Se houver fotos na requisição, salva
        if (data.files) {
          processFiles(data.files, IMAGE_FOLDER_ID);
        }

        try {
          enviarRelatorio(mappedData, data.email || null, null, data.files);
          return ContentService.createTextOutput("OK");
        } catch (eResend) {
          console.error("Erro ao reenviar e-mail de avaliação: " + eResend.toString());
          try {
             MailApp.sendEmail({
               to: 'deny.goncalves@risel.com.br',
               subject: 'ERRO AO REENVIAR AVALIAÇÃO: ' + (mappedData['MOTORISTA'] || 'N/A'),
               name: 'Sistema de Monitoramento Risel',
               htmlBody: 'Houve um erro ao reenviar a avaliação:<br><br><b>Mensagem:</b> ' + eResend.message + '<br><b>Stack:</b> ' + String(eResend.stack)
             });
          } catch(ex) {}
          return ContentService.createTextOutput("Erro ao reenviar e-mail de avaliação: " + eResend.toString());
        }
      } else {
        return ContentService.createTextOutput("Erro: Avaliação não encontrada para reenvio.");
      }
    }

    if (data.type === 'updateEvaluation') {
      var sheet = ss.getSheetByName(SHEET_NAME);
      var id = data.id;
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == id) {
          sheet.getRange(i + 1, 1, 1, data.row.length).setValues([data.row]);
          break;
        }
      }
      processFiles(data.files, IMAGE_FOLDER_ID);
      return ContentService.createTextOutput("OK");
    }

    if (data.type === 'deleteEvaluation') {
      var sheet = ss.getSheetByName(SHEET_NAME);
      var id = data.id;
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == id) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput("OK");
    }

    // --- LÓGICA PARA CHAMADOS INTERNOS (TICKETS) ---
    if (data.type === 'ticket' || data.type === 'updateTicket') {
       var targetSheet = getSheetByGid(ss, data.gid);
       
       if (!targetSheet) targetSheet = ss.getSheetByName("Chamados Internos");
       if (!targetSheet) targetSheet = ss.getSheetByName("Chamados");
       if (!targetSheet) targetSheet = ss.getSheetByName("Tickets");
       if (!targetSheet) targetSheet = ss.getSheetByName("Ticket");
       if (!targetSheet) targetSheet = ss.getSheetByName("Chamado");

       if (targetSheet) {
          if (data.type === 'ticket') {
              targetSheet.appendRow(data.row);
          } else {
              var tRows = targetSheet.getDataRange().getValues();
              for (var k = 1; k < tRows.length; k++) {
                  if (String(tRows[k][0]) === String(data.id)) {
                      targetSheet.getRange(k + 1, 1, 1, data.row.length).setValues([data.row]);
                      break;
                  }
              }
          }
          processFiles(data.files, TICKETS_FOLDER_ID); 
       } else {
          return ContentService.createTextOutput("Erro: Aba de Chamados não encontrada. Verifique se a aba se chama 'Chamados Internos'.");
       }
       return ContentService.createTextOutput("OK");
    }

    // --- LÓGICA GENÉRICA ---
    if (['addDriver', 'updateDriver', 'deleteDriver', 
         'addOperator', 'updateOperator', 'deleteOperator', 
         'addAccessLog', 'updateAccessLog', 'deleteAccessLog',
         'deleteTicket', 'addShiftOccurrence', 'updateShiftOccurrence', 'deleteShiftOccurrence',
         'addBolaPreta', 'updateBolaPreta', 'deleteBolaPreta', 'macroSync',
         'addFleet', 'updateFleet', 'deleteFleet'].includes(data.type)) {
       
       var targetSheet = getSheetByGid(ss, data.gid);
       
       if (!targetSheet && data.type === 'deleteTicket') {
           if (!targetSheet) targetSheet = ss.getSheetByName("Chamados Internos");
           if (!targetSheet) targetSheet = ss.getSheetByName("Chamados");
           if (!targetSheet) targetSheet = ss.getSheetByName("Tickets");
       }

       if (targetSheet) {
           if (data.type === 'macroSync') {
               if (data.rows && data.rows.length > 0) {
                  var startRow = targetSheet.getLastRow() + 1;
                  
                  if (startRow === 1) {
                      var defaultHeaders = ["ID_SISTEMA", "MOTORISTA", "DATA_INICIO", "HORA_INICIO", "DATA_FIM", "HORA_FIM", "FROTA", "NOME_MACRO", "TIPO_MACRO", "PONTO_REFERENCIA", "DURACAO", "KM"];
                      targetSheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
                      startRow = 2;
                  }
                  
                  var maxCols = data.rows[0].length;
                  for(var i=0; i<data.rows.length; i++) {
                     if(data.rows[i].length > maxCols) maxCols = data.rows[i].length;
                  }
                  data.rows.forEach(function(r) {
                      while(r.length < maxCols) r.push("");
                  });
                  targetSheet.getRange(startRow, 1, data.rows.length, maxCols).setValues(data.rows);
               }
           } else if (!data.type.includes('delete') && !data.type.includes('update')) { // Add
               if (data.row) targetSheet.appendRow(data.row);
           } else {
               var tRows = targetSheet.getDataRange().getValues();
               for (var k = 1; k < tRows.length; k++) {
                   var rowId = String(tRows[k][0]);
                   var targetId = String(data.id || "");
                   var rowName = String(tRows[k][1]);
                   var targetName = String(data.name || data.originalName || "");
                   
                   if ((targetId && rowId === targetId) || (targetName && rowName === targetName && (!rowId || rowId === "" || rowId === "undefined"))) {
                        if (data.type.includes('delete')) {
                            targetSheet.deleteRow(k + 1);
                        } else if (data.type.includes('update') && data.row) {
                            targetSheet.getRange(k + 1, 1, 1, data.row.length).setValues([data.row]);
                        }
                        break;
                   }
               }
           }
           
           if ((data.type === 'addBolaPreta' || data.type === 'updateBolaPreta') && data.files) {
               processFiles(data.files, IMAGE_FOLDER_ID);
           } else if (data.files) {
               processFiles(data.files, TICKETS_FOLDER_ID);
           }
       }
       return ContentService.createTextOutput("OK");
    }

    if (data.type === 'finalizeShift') {
        var targetSheet = getSheetByGid(ss, data.gid);
        if (targetSheet) {
            var tRows = targetSheet.getDataRange().getValues();
            var tz = ss.getSpreadsheetTimeZone();
            for (var k = 1; k < tRows.length; k++) {
                var rowDate = tRows[k][1];
                var rowDateStr = "";
                if (rowDate instanceof Date) {
                    rowDateStr = Utilities.formatDate(rowDate, tz, "yyyy-MM-dd");
                } else {
                    rowDateStr = String(rowDate).trim();
                }
                
                if (rowDateStr === String(data.date).trim() && 
                    String(tRows[k][2]).trim() === String(data.shift).trim() && 
                    String(tRows[k][7]).toUpperCase().trim() !== 'TRUE') {
                    targetSheet.getRange(k + 1, 8).setValue('TRUE');
                }
            }
        }
        return ContentService.createTextOutput("OK");
    }

    if (data.type === 'testEmail') { 
      try {
        enviarTesteManual_Deny(data.email); 
        return ContentService.createTextOutput("OK"); 
      } catch(e) {
        return ContentService.createTextOutput("Erro Email: " + e.message);
      }
    }

    if (data.type === 'bolaPretaEmail' || data.type === 'resendBolaPretaEmail') {
      try {
        enviarEmailBolaPreta(data.record, data.email, data.files);
        return ContentService.createTextOutput("OK");
      } catch (e) {
        try {
           MailApp.sendEmail({
             to: 'deny.goncalves@risel.com.br',
             subject: 'ERRO AO GERAR EMAIL BOLA PRETA: ' + (data.record ? data.record.driver : 'N/A'),
             htmlBody: 'Houve um erro ao enviar o relatório do Bola Preta para ' + data.email + '<br><br><b>Mensagem:</b> ' + e.message + '<br><b>Linha/Stack:</b> ' + String(e.stack)
           });
        } catch(ex) {}
        return ContentService.createTextOutput("Erro Email Bola Preta: " + e.message);
      }
    }

    return ContentService.createTextOutput("Ação Desconhecida");
  } catch (err) { 
    return ContentService.createTextOutput("Erro: " + err.toString()); 
  } finally {
    lock.releaseLock();
  }
}

function enviarEmailBolaPreta(d, emailDestino, reqFiles) {
  const vStatus = d.verificationStatus || 'N/D';
  const subject = `RELATÓRIO DE VIAGEM: ${d.date} - ${d.plate} - ${d.vehicle} - ${d.driver} - ${vStatus}`;
  
  // Decodifica BASE64 localmente
  const memoryFiles = {};
  if (reqFiles && reqFiles.length > 0) {
      reqFiles.forEach(function(f) {
         if (f.base64) {
             var cleanBase64 = f.base64.replace(/^data:image\/\w+;base64,/, "");
             var bytes = Utilities.base64Decode(cleanBase64);
             memoryFiles[f.name] = Utilities.newBlob(bytes, f.mimeType || 'image/png', f.name);
         }
      });
  }

  const imageFolder = obterPastaDriveSegura(IMAGE_FOLDER_ID, "Anexos_Fotos_Monitoramento");

  // Tenta primeiramente gerar o PDF HTML formatado de alta qualidade
  var pdfVisual = null;
  try {
    pdfVisual = gerarPdfHtmlFormatado(d, memoryFiles, imageFolder);
  } catch (ePdf) {
    Logger.log("Erro ao gerar PDF HTML formatado Bola Preta: " + ePdf.message);
  }

  // Anexos
  var attachmentsList = [];
  if (pdfVisual) {
    attachmentsList.push(pdfVisual);
  } else {
    // Fallback de contingência pelo Google Doc caso ocorra erro inesperado no HTML
    try {
      const outputFolder = obterPastaDriveSegura(OUTPUT_FOLDER_ID, "Relatórios Bola Preta");
      const templateFile = obterArquivoTemplateSeguro(BOLA_PRETA_TEMPLATE_ID, "Modelo Bola Preta");
      const docName = `RELATÓRIO DE VIAGEM - ${d.vehicle} - ${d.date}`;
      const copyFile = templateFile.makeCopy(docName, outputFolder);
      const doc = DocumentApp.openById(copyFile.getId());
      doc.saveAndClose();
      const pdfFile = copyFile.getAs(MimeType.PDF);
      attachmentsList.push(pdfFile);
      copyFile.setTrashed(true);
    } catch(eFallback) {
      Logger.log("Fallback do Google Doc falhou: " + eFallback.message);
    }
  }

  const destinatarioFinal = emailDestino ? (emailDestino + ', monitoramento@risel.com.br') : 'monitoramento@risel.com.br, deny.goncalves@risel.com.br';

  MailApp.sendEmail({
    to: destinatarioFinal,
    subject: subject,
    htmlBody: getHtmlEmailBolaPreta(d, vStatus),
    name: 'Sistema de Monitoramento Risel',
    attachments: attachmentsList
  });
}

function obterImagemBase64(fileName, memoryFiles, imageFolder) {
  if (!fileName) return null;
  
  // 1. Memory Cache
  if (memoryFiles && memoryFiles[fileName]) {
    var blob = memoryFiles[fileName];
    try {
      return "data:image/png;base64," + Utilities.base64Encode(blob.getBytes());
    } catch(e) {
      Logger.log("Erro ao ler bytes em memória: " + e.message);
    }
  }
  
  // 2. Drive Folder
  if (imageFolder) {
    try {
      var blob = buscarBlobFlexivel(imageFolder, fileName, memoryFiles);
      if (blob) {
        return "data:image/png;base64," + Utilities.base64Encode(blob.getBytes());
      }
    } catch(e) {
      Logger.log("Erro ao carregar imagem " + fileName + " do Drive para Base64: " + e.message);
    }
  }
  return null;
}

function buscarBlobFlexivel(folder, fileName, memoryFiles) {
  if (!fileName) return null;

  try {
    // Checa se está em memoryFiles com variações
    if (memoryFiles) {
      if (memoryFiles[fileName]) return memoryFiles[fileName];
      for (var k in memoryFiles) {
        if (k.toLowerCase() === fileName.toLowerCase() || k.endsWith(fileName) || fileName.endsWith(k)) {
          return memoryFiles[k];
        }
      }
    }

    if (!folder) return null;

    // Busca exata no Drive
    try {
      var files = folder.getFilesByName(fileName);
      if (files.hasNext()) return files.next().getBlob();
    } catch(e) {}

    // Busca variações de extensão
    var nameWithoutExt = (fileName.indexOf('.') !== -1) ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
    var extensions = ['.png', '.jpg', '.jpeg', ''];

    for (var i = 0; i < extensions.length; i++) {
      var testName = nameWithoutExt + extensions[i];
      try {
        var fTest = folder.getFilesByName(testName);
        if (fTest.hasNext()) return fTest.next().getBlob();
      } catch(e2) {}
    }
  } catch(err) {
    console.error("Erro em buscarBlobFlexivel: " + err.toString());
  }

  return null;
}

function gerarPdfHtmlFormatado(d, memoryFiles, imageFolder) {
  var rawStatus = d.verificationStatus || 'OK';
  var vStatus = rawStatus;
  var vStatusObs = d.verificationStatusObs || '';
  if (rawStatus.indexOf(' - ') > -1) {
    vStatus = rawStatus.split(' - ')[0];
    vStatusObs = rawStatus.substring(rawStatus.indexOf(' - ') + 3);
  }

  var isOk = vStatus === 'OK';
  var accentColor = isOk ? '#00ad74' : '#ea580c';
  var accentBorder = isOk ? '#bbf7d0' : '#ffedd5';

  if (vStatus === 'Observações Inseridas' && vStatusObs) {
    // Escapa HTML para prevenir injeção
    vStatusObs = String(vStatusObs).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var docId = d.id ? d.id.slice(0, 8).toUpperCase() : 'N/D';
  var dataEmissao = d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  var operador = d.operator ? d.operator.toUpperCase() : 'SISTEMA';

  // Carregar imagens como Base64
  var cellularImgBase64 = obterImagemBase64(d.celularImage, memoryFiles, imageFolder);
  var smokingImgBase64 = obterImagemBase64(d.fumandoImage, memoryFiles, imageFolder);
  var beltImgBase64 = obterImagemBase64(d.cintoImage, memoryFiles, imageFolder);
  var print1ImgBase64 = obterImagemBase64(d.printImage1, memoryFiles, imageFolder);
  var print2ImgBase64 = obterImagemBase64(d.printImage2, memoryFiles, imageFolder);
  var print3ImgBase64 = obterImagemBase64(d.printImage3, memoryFiles, imageFolder);
  var mapImgBase64 = obterImagemBase64(d.mapImage, memoryFiles, imageFolder);

  // Formatação das mídias em HTML
  var imagesHtml = '';
  
  var addImageBlock = function(base64, label) {
    if (!base64) return '';
    var labelHtml = '';
    if (label) {
      labelHtml = '<div style="background: #f1f5f9; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-weight: bold; color: #334155; text-align: center; margin-top: 6px; font-family: Arial, sans-serif; border: 1px solid #e2e8f0; word-break: break-word;">' + label + '</div>';
    }
    return '<div style="margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px; background: #ffffff; text-align: center; page-break-inside: avoid; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">' +
             '<div style="border-radius: 6px; overflow: hidden; background: #f8fafc; text-align: center; height: 190px; width: 100%;">' +
               '<img src="' + base64 + '" style="width: 100%; height: 190px; display: block; object-fit: cover; border: 0;" />' +
             '</div>' +
             labelHtml +
           '</div>';
  };

  var imgBlocks = [];
  if (print1ImgBase64) imgBlocks.push(addImageBlock(print1ImgBase64, d.printImage1Desc));
  if (print2ImgBase64) imgBlocks.push(addImageBlock(print2ImgBase64, d.printImage2Desc));
  if (print3ImgBase64) imgBlocks.push(addImageBlock(print3ImgBase64, d.printImage3Desc));
  if (cellularImgBase64) imgBlocks.push(addImageBlock(cellularImgBase64, d.celularImageDesc || 'Condutor ao Celular'));
  if (smokingImgBase64) imgBlocks.push(addImageBlock(smokingImgBase64, d.fumandoImageDesc || 'Condutor Fumando'));
  if (beltImgBase64) imgBlocks.push(addImageBlock(beltImgBase64, d.cintoImageDesc || 'Sem Cinto de Segurança'));

  if (imgBlocks.length > 0) {
    imagesHtml += '<div style="margin-top: 25px; page-break-inside: avoid;">' +
                    '<h3 style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-left: 4px solid ' + accentColor + '; padding-left: 8px; margin-bottom: 12px; letter-spacing: 0.5px;">5. Anexos e Evidências Visuais</h3>' +
                    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed; width: 100%;">';
    
    for (var i = 0; i < imgBlocks.length; i += 2) {
      imagesHtml += '<tr>';
      imagesHtml += '<td width="49%" valign="top" style="width: 49%;">' + imgBlocks[i] + '</td>';
      if (i + 1 < imgBlocks.length) {
        imagesHtml += '<td width="2%" style="width: 2%;"></td>';
        imagesHtml += '<td width="49%" valign="top" style="width: 49%;">' + imgBlocks[i+1] + '</td>';
      } else {
        imagesHtml += '<td width="51%" style="width: 51%;"></td>';
      }
      imagesHtml += '</tr>';
    }
    
    imagesHtml += '</table></div>';
  }

  var mapHtml = '';
  if (mapImgBase64) {
    mapHtml = '<div style="margin-top: 20px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; background: #ffffff; page-break-inside: avoid; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">' +
                '<h3 style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-left: 4px solid ' + accentColor + '; padding-left: 8px; margin-bottom: 10px; text-align: left; letter-spacing: 0.5px;">6. Trajeto Geográfico (Mapa de Movimentação)</h3>' +
                '<div style="border-radius: 8px; overflow: hidden; background: #f8fafc; text-align: center; width: 100%; height: 280px; line-height: 280px; border: 1px solid #cbd5e1;">' +
                  '<img src="' + mapImgBase64 + '" style="width: 100%; max-height: 280px; height: 280px; object-fit: contain; display: inline-block; vertical-align: middle; border: 0;" />' +
                '</div>' +
              '</div>';
  }

  var formatarDataBR = function(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dateStr;
  };
  var dataViagemFormatada = formatarDataBR(d.date || '');

  var htmlContent = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
      '<meta charset="utf-8">' +
      '<title>Relatório de Viagem</title>' +
      '<style>' +
        '@page { size: A4; margin: 15mm 12mm 15mm 12mm; }' +
        'body { font-family: Arial, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 0; }' +
        '.data-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #cbd5e1; }' +
        '.data-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 10px; }' +
        '.data-label { color: #475569; font-weight: bold; text-transform: uppercase; background: #f8fafc; width: 25%; letter-spacing: 0.3px; }' +
        '.data-value { font-weight: bold; color: #0f172a; }' +
      '</style>' +
    '</head>' +
    '<body>' +
      
      '<div style="height: 6px; background-color: ' + accentColor + '; margin-bottom: 15px; border-radius: 3px;"></div>' +

      '<div style="border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 22px;">' +
        '<table width="100%" border="0" cellspacing="0" cellpadding="0">' +
          '<tr>' +
            '<td width="70%" valign="middle" align="left">' +
              '<h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">RISEL COMBUSTÍVEIS</h1>' +
              '<p style="margin: 3px 0 0 0; font-family: Arial, sans-serif; font-size: 8px; font-weight: 900; color: #00ad74; text-transform: uppercase; letter-spacing: 0.5px;">SISTEMA DE CONTROLE DE MONITORAMENTO DE VIAGENS</p>' +
            '</td>' +
            '<td width="30%" align="right" valign="middle" style="font-family: monospace; font-size: 8px; color: #64748b; line-height: 1.5; text-align: right;">' +
              '<div><strong>DOCUMENTO ID:</strong> BP-' + docId + '</div>' +
              '<div><strong>EMISSÃO:</strong> ' + dataEmissao + '</div>' +
              '<div><strong>OPERADOR:</strong> ' + operador + '</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
      
      '<div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-left: 4px solid ' + accentColor + '; padding-left: 8px; margin-top: 15px; margin-bottom: 12px; letter-spacing: 0.5px;">' +
        '1. Identificação do Condutor e Veículo' +
      '</div>' +

      '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; table-layout: fixed; width: 100%;">' +
        '<tr>' +
          '<td width="49%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; height: 50px;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">👤 Motorista</span>' +
              '<div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 5px; text-transform: uppercase;">' + (d.driver || 'NÃO INFORMADO') + '</div>' +
            '</div>' +
          '</td>' +
          '<td width="2%"></td>' +
          '<td width="49%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; height: 50px;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">🏢 Base Operacional</span>' +
              '<div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 5px; text-transform: uppercase;">' + (d.base || 'TRIÂNGULO') + '</div>' +
            '</div>' +
          '</td>' +
        '</tr>' +
        '<tr style="height: 10px;"><td colspan="3"></td></tr>' +
        '<tr>' +
          '<td width="49%" valign="top">' +
            '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed; width: 100%;">' +
              '<tr>' +
                '<td width="48%" valign="top">' +
                  '<div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; height: 50px; text-align: center;">' +
                    '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">🚛 Frota</span>' +
                    '<div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 5px; text-transform: uppercase;">' + (d.vehicle || 'NÃO INFORMADO') + '</div>' +
                  '</div>' +
                '</td>' +
                '<td width="4%"></td>' +
                '<td width="48%" valign="top">' +
                  '<div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; height: 50px; text-align: center;">' +
                    '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">🔢 Placa</span>' +
                    '<div style="font-size: 13px; font-weight: 800; color: #00ad74; margin-top: 5px; text-transform: uppercase;">' + (d.plate || 'NÃO INFORMADO') + '</div>' +
                  '</div>' +
                '</td>' +
              '</tr>' +
            '</table>' +
          '</td>' +
          '<td width="2%"></td>' +
          '<td width="49%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; height: 50px;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">📝 Verificação ID</span>' +
              '<div style="font-size: 13px; font-weight: 850; color: #1e293b; margin-top: 5px;">BP-' + docId + '</div>' +
            '</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +
      
      '<div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-left: 4px solid ' + accentColor + '; padding-left: 8px; margin-top: 25px; margin-bottom: 12px; letter-spacing: 0.5px;">' +
        '2. Cronologia e Resumo do Percurso' +
      '</div>' +
      '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px; table-layout: fixed; width: 100%;">' +
        '<tr>' +
          '<td width="19%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">📅 Data Viagem</span>' +
              '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + dataViagemFormatada + '</div>' +
            '</div>' +
          '</td>' +
          '<td width="1%"></td>' +
          '<td width="19%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">⏱️ Início Jornada</span>' +
              '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.startTime || '--:--') + '</div>' +
            '</div>' +
          '</td>' +
          '<td width="1%"></td>' +
          '<td width="19%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">📍 Saída Base</span>' +
              '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.departureTime || '--:--') + '</div>' +
            '</div>' +
          '</td>' +
          '<td width="1%"></td>' +
          '<td width="19%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">📍 Retorno Base</span>' +
              '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.arrivalBaseTime || '--:--') + '</div>' +
            '</div>' +
          '</td>' +
          '<td width="1%"></td>' +
          '<td width="20%" valign="top">' +
            '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
              '<span style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">⏱️ Fim Jornada</span>' +
              '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.endTime || '--:--') + '</div>' +
            '</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +
      
      '<div style="page-break-inside: avoid;">' +
        '<div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-left: 4px solid ' + accentColor + '; padding-left: 8px; margin-top: 25px; margin-bottom: 12px; letter-spacing: 0.5px;">' +
          '3. Métricas de Paradas e Clientes Macro' +
        '</div>' +
        '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; table-layout: fixed; width: 100%;">' +
          '<tr>' +
            '<td width="19%" valign="top">' +
              '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
                '<span style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">⏱️ Clientes</span>' +
                '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.timeAtClient || '--:--') + '</div>' +
              '</div>' +
            '</td>' +
            '<td width="1%"></td>' +
            '<td width="19%" valign="top">' +
              '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
                '<span style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">📈 Tempo Médio</span>' +
                '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.avgTimeClients || '--:--') + '</div>' +
              '</div>' +
            '</td>' +
            '<td width="1%"></td>' +
            '<td width="19%" valign="top">' +
              '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
                '<span style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">🛑 Paradas Inf.</span>' +
                '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.informedStopsCount || '0') + '</div>' +
              '</div>' +
            '</td>' +
            '<td width="1%"></td>' +
            '<td width="19%" valign="top">' +
              '<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">' +
                '<span style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">⏳ Tempo Parada</span>' +
                '<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 5px;">' + (d.totalStopsTime || '--:--') + '</div>' +
              '</div>' +
            '</td>' +
            '<td width="1%"></td>' +
            '<td width="20%" valign="top">' +
              '<div style="background-color: #eefdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; text-align: center;">' +
                '<span style="font-size: 8px; color: #047857; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">🛣️ Distância</span>' +
                '<div style="font-size: 12px; font-weight: black; color: #047857; margin-top: 5px;">' + (d.kmDriven ? d.kmDriven + ' KM' : 'N/A') + '</div>' +
              '</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
        '<table class="data-table" style="border-radius: 8px; overflow: hidden;">' +
          '<tr>' +
            '<td class="data-label" width="25%">🧑‍🤝‍🧑 Clientes Macro</td>' +
            '<td class="data-value" width="75%">' + (d.macroClients || 'Nenhum informado') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="data-label">📝 Observações</td>' +
            '<td class="data-value" style="font-style: italic; font-weight: normal; color: #334155;">' + (d.macroClientsObs || 'Sem observações cadastradas.') + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
      
      '<div style="page-break-inside: avoid;">' +
        '<div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-left: 4px solid ' + accentColor + '; padding-left: 8px; margin-top: 25px; margin-bottom: 12px; letter-spacing: 0.5px;">' +
          '4. Avaliação de Desvios de Telemetria e Conduta' +
        '</div>' +
        '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; table-layout: fixed; width: 100%;">' +
          '<tr>' +
            '<td width="49%" valign="top">' +
              '<div style="border: 1px solid ' + (d.telemetryInfractions === 'Sim' ? '#fca5a5' : '#a7f3d0') + '; border-radius: 12px; padding: 12px; background: ' + (d.telemetryInfractions === 'Sim' ? '#fef2f2' : '#f0fdf4') + '; min-height: 90px;">' +
                '<table width="100%" border="0" cellspacing="0" cellpadding="0">' +
                  '<tr>' +
                    '<td align="left"><strong style="font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.3px;">📡 Telemetria de Frota</strong></td>' +
                    '<td align="right" style="text-align: right;">' +
                      '<span style="background-color: ' + (d.telemetryInfractions === 'Sim' ? '#ef4444' : '#10b981') + '; color: #ffffff; padding: 3px 6px; border-radius: 4px; font-family: Arial, sans-serif; font-size: 8px; font-weight: bold; text-transform: uppercase;">' +
                        (d.telemetryInfractions === 'Sim' ? 'DESVIOS' : 'SEM DESVIOS') +
                      '</span>' +
                    '</td>' +
                  '</tr>' +
                '</table>' +
                '<p style="font-size: 9px; color: ' + (d.telemetryInfractions === 'Sim' ? '#991b1b' : '#065f46') + '; margin: 10px 0 0 0; line-height: 1.4; font-weight: 500;">' +
                  (d.telemetryInfractions === 'Sim' 
                    ? 'Opções identificadas: ' + (Array.isArray(d.telemetryOptions) ? d.telemetryOptions.join(', ') : d.telemetryOptions) 
                    : 'Nenhum evento severo (excesso de velocidade, frenagem brusca) registrado na jornada.') +
                '</p>' +
              '</div>' +
            '</td>' +
            '<td width="2%"></td>' +
            '<td width="49%" valign="top">' +
              '<div style="border: 1px solid ' + (d.videoTelemetryInfractions === 'Sim' ? '#fca5a5' : '#a7f3d0') + '; border-radius: 12px; padding: 12px; background: ' + (d.videoTelemetryInfractions === 'Sim' ? '#fef2f2' : '#f0fdf4') + '; min-height: 90px;">' +
                '<table width="100%" border="0" cellspacing="0" cellpadding="0">' +
                  '<tr>' +
                    '<td align="left"><strong style="font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.3px;">📹 Vídeo-Telemetria (Câmera)</strong></td>' +
                    '<td align="right" style="text-align: right;">' +
                      '<span style="background-color: ' + (d.videoTelemetryInfractions === 'Sim' ? '#ef4444' : '#10b981') + '; color: #ffffff; padding: 3px 6px; border-radius: 4px; font-family: Arial, sans-serif; font-size: 8px; font-weight: bold; text-transform: uppercase;">' +
                        (d.videoTelemetryInfractions === 'Sim' ? 'DESVIOS' : 'SEM DESVIOS') +
                      '</span>' +
                    '</td>' +
                  '</tr>' +
                '</table>' +
                '<p style="font-size: 9px; color: ' + (d.videoTelemetryInfractions === 'Sim' ? '#991b1b' : '#065f46') + '; margin: 10px 0 0 0; line-height: 1.4; font-weight: 500;">' +
                  (d.videoTelemetryInfractions === 'Sim' 
                    ? 'Opções identificadas: ' + (Array.isArray(d.videoTelemetryOptions) ? d.videoTelemetryOptions.join(', ') : d.videoTelemetryOptions) 
                    : 'Sem infrações comportamentais da câmera (celular, fadiga ou ausência de cinto).') +
                '</p>' +
              '</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
        '<table class="data-table" style="border-radius: 8px; overflow: hidden; margin-bottom: 5px;">' +
          '<tr>' +
            '<td class="data-label" width="25%">🛑 Paradas Não Inf.?</td>' +
            '<td class="data-value" width="25%">' + (d.uninformedStops || 'Não') + '</td>' +
            '<td class="data-label" width="25%">🔍 Atit. Suspeita?</td>' +
            '<td class="data-value" width="25%">' + (d.suspiciousActivity || 'Não') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="data-label">ℹ️ Obs Paradas N/I</td>' +
            '<td class="data-value" style="font-style: italic; font-weight: normal;">' + (d.uninformedStopsObs || 'Nada consta') + '</td>' +
            '<td class="data-label">ℹ️ Obs Atit. Suspeita</td>' +
            '<td class="data-value" style="font-style: italic; font-weight: normal;">' + (d.suspiciousActivityObs || 'Nada consta') + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
      
      imagesHtml +
      mapHtml +
      
      '<div style="page-break-inside: avoid; text-align: center; margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 12px;">' +
        '<p style="margin: 0; font-family: Arial, sans-serif; font-size: 8px; color: #475569; font-weight: bold; letter-spacing: 0.3px;">' +
          'Documento emitido através do Sistema de Monitoramento Risel Combustíveis' +
        '</p>' +
      '</div>' +
    '</body>' +
    '</html>';

  var htmlBlob = Utilities.newBlob(htmlContent, 'text/html', 'relatorio_visual_web.html');
  var pdfFileBlob = htmlBlob.getAs('application/pdf');
  
  var motoristaNome = d.driver ? d.driver.trim().toUpperCase() : 'MOTORISTA';
  var pdfName = "Relatório " + motoristaNome + " - " + dataViagemFormatada + ".pdf";
  if (d.vehicle) {
    pdfName = "Relatório " + motoristaNome + " - " + d.vehicle + " - " + dataViagemFormatada + ".pdf";
  }
  pdfFileBlob.setName(pdfName);
  return pdfFileBlob;
}

function getHtmlEmailBolaPreta(d, vStatus) {
  const isOk = vStatus === 'OK';
  const headerColor = isOk ? '#047857' : '#b91c1c';
  const statusColor = isOk ? '#059669' : '#ea580c';
  const statusBg = isOk ? '#ecfdf5' : '#fff7ed';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Operacional - Risel</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
              
              <tr>
                <td style="background-color: ${headerColor}; padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Relatório de Conformidade</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Monitoramento de Jornada • Risel Combustíveis</p>
                </td>
              </tr>

              <tr>
                <td style="padding: 40px 30px;">
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${statusBg}; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 24px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 11px; color: ${statusColor}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Parecer Operacional</p>
                        <p style="margin: 0; font-size: 28px; color: ${statusColor}; font-weight: bold;">${vStatus.toUpperCase()}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 24px 24px 24px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #cbd5e1; padding-top: 16px;">
                          <tr>
                            <td width="50%" align="left" style="font-size: 12px; color: #475569;">
                              <strong style="color: #0f172a; display: block; margin-bottom: 4px;">MOTORISTA</strong>
                              ${d.driver}
                            </td>
                            <td width="50%" align="right" style="font-size: 12px; color: #475569;">
                              <strong style="color: #0f172a; display: block; margin-bottom: 4px;">DATA VERIFICADA</strong>
                              ${d.date}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <h2 style="font-size: 16px; color: #0f172a; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid ${headerColor}; padding-bottom: 8px; display: inline-block;">Sumário Técnico</h2>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 14px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;"><strong>VÉICULO / PLACA</strong></td>
                      <td style="padding: 14px 16px; font-size: 13px; color: #0f172a; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">${d.vehicle} (${d.plate})</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0;"><strong>DISTÂNCIA (KM)</strong></td>
                      <td style="padding: 14px 16px; font-size: 13px; color: #0f172a; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${d.kmDriven} KM</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;"><strong>PERÍODO EM CLIENTES</strong></td>
                      <td style="padding: 14px 16px; font-size: 13px; color: #0f172a; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">${d.timeAtClient}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0;"><strong>INÍCIO / TÉRMINO</strong></td>
                      <td style="padding: 14px 16px; font-size: 13px; color: #0f172a; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${d.startTime || '-'} às ${d.endTime || '-'}</td>
                    </tr>
                  </table>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="background-color: ${headerColor}; padding: 20px; text-align: center; border-radius: 8px;">
                        <p style="margin: 0; color: #ffffff; font-size: 13px; line-height: 1.5;">O Relatório Detalhado com as evidências fotográficas e métricas expandidas está anexado a este e-mail em formato <strong>PDF</strong>.</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <tr>
                <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Risel Combustíveis • Gestão Operacional</p>
                  <p style="margin: 8px 0 0 0; font-size: 10px; color: #94a3b8;">Mensagem automática gerada pelo Sistema de Monitoramento.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getSheetByGid(ss, gid) {
  if (!gid && gid !== 0) return null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) return sheets[i];
  }
  return null;
}

function processFiles(files, targetFolderId) {
  if (files && files.length > 0) {
    try {
      var folderIdToUse = targetFolderId || IMAGE_FOLDER_ID;
      var folder = obterPastaDriveSegura(folderIdToUse, "Anexos_Fotos_Monitoramento");
      
      files.forEach(function(file) {
        if (file.base64) {
          var fileName = file.name;
          try {
            var existing = folder.getFilesByName(fileName);
            while (existing.hasNext()) { existing.next().setTrashed(true); }
          } catch(eExist) {}
          
          var cleanBase64 = file.base64.replace(/^data:image\/\w+;base64,/, "");
          var mimeType = file.mimeType || "image/png";
          var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), mimeType, fileName);
          folder.createFile(blob);
        }
      });
    } catch(errProc) {
      console.error("Erro ao processar arquivos: " + errProc.toString());
    }
  }
}

function enviarUltimaAvaliacao() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "Nenhuma avaliação encontrada.";
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = {};
  headers.forEach((h, i) => data[String(h).trim()] = rowData[i]);
  enviarRelatorio(data); 
  return "Relatório enviado.";
}

function enviarTesteManual_Deny(emailOverride) {
  const emailDestino = emailOverride || EMAIL_TESTE_EXCLUSIVO;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("Sem dados na planilha para teste.");
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = {};
  headers.forEach((h, i) => data[String(h).trim()] = rowData[i]);
  
  enviarRelatorio(data, emailDestino, ""); 
}

function enviarRelatorio(data, destinatarioOverride, copiaOverride, reqFiles) {
  const motorista = String(data['MOTORISTA'] || data['Motorista'] || 'N/D').trim();
  let resultado = data['RESULTADO GERAL DO ACOMPANHAMENTO'] || data['RESULTADO GERAL'] || data['RESULTADO'] || 'N/D';
  
  if (typeof resultado === 'number') {
      resultado = (resultado * 100).toFixed(2) + '%';
  } else if (String(resultado).includes('0.') && !String(resultado).includes('%')) {
      resultado = (parseFloat(resultado) * 100).toFixed(2) + '%';
  }

  let dataAvalFull = data['DATA AVALIAÇÃO'] || data['Data Avaliação'] || data['DATA AVALIACAO'] || data['DATA'];
  let dataSomenteData = 'N/D';
  
  if (dataAvalFull instanceof Date) {
    dataSomenteData = Utilities.formatDate(dataAvalFull, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } else if (typeof dataAvalFull === 'string' && dataAvalFull.trim() !== '') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataAvalFull)) {
       var parts = dataAvalFull.split('-');
       dataSomenteData = parts[2] + '/' + parts[1] + '/' + parts[0];
    } else {
       dataSomenteData = dataAvalFull;
    }
  }

  // Prepara memória de arquivos enviados no request
  const memoryFiles = {};
  if (reqFiles && reqFiles.length > 0) {
      reqFiles.forEach(function(f) {
         if (f.base64) {
             var cleanBase64 = f.base64.replace(/^data:image\/\w+;base64,/, "");
             var bytes = Utilities.base64Decode(cleanBase64);
             memoryFiles[f.name] = Utilities.newBlob(bytes, f.mimeType || 'image/png', f.name);
         }
      });
  }

  const imageFolder = obterPastaDriveSegura(IMAGE_FOLDER_ID, "Anexos_Fotos_Monitoramento");

  // Gera o PDF HTML formatado da avaliação (ÚNICO ARQUIVO ENVIADO)
  var pdfFileHtml = null;
  try {
    pdfFileHtml = gerarPdfHtmlAvaliacao(data, memoryFiles, imageFolder);
    var motoristaSanitized = motorista.replace(/[^a-zA-Z0-9]/g, '_');
    var dataSanitized = dataSomenteData.replace(/\//g, '-');
    pdfFileHtml.setName('Relatório_Avaliacao_' + motoristaSanitized + '_' + dataSanitized + '.pdf');
  } catch(eHtml) {
    console.error("Erro ao gerar PDF HTML para avaliação: " + eHtml.toString());
  }

  if (!pdfFileHtml) {
    console.error("Erro crítico: PDF HTML não pôde ser gerado.");
    return;
  }

  var mailOptions = {
    to: destinatarioOverride || EMAIL_DESTINATARIOS_PRINCIPAIS,
    subject: 'AVALIAÇÃO DE DIREÇÃO - ' + motorista.toUpperCase() + ' (' + dataSomenteData + ')',
    name: 'Sistema de Monitoramento Risel',
    htmlBody: getHtmlEmailBody({
      motorista: motorista,
      avaliador: data['AVALIADOR'] || data['Avaliador'] || 'N/A',
      transportadora: data['TRANSPORTADORA'] || data['Transportadora'] || data['EMPRESA'] || 'RISEL COMBUSTÍVEIS',
      frota: data['FROTA'] || data['Frota'] || data['VEÍCULO'] || data['PLACA'] || 'N/A',
      local: data['LOCAL / TRECHO'] || data['LOCAL/TRECHO'] || data['LOCAL DA AVALIAÇÃO'] || data['LOCAL'] || data['TRECHO'] || 'N/A',
      dataAval: dataSomenteData,
      resultado: resultado,
      pontos: data['PONTOS POR HORA'] || data['PONTUAÇÃO'] || data['Pontos'] || '0',
      observacao: data['OBSERVAÇÕES'] || data['Observações'] || data['OBSERVAÇÃO'] || ''
    }),
    attachments: [pdfFileHtml] // APENAS O HTML/PDF GERADO COMO ÚNICO ARQUIVO
  };

  var finalCc = (copiaOverride !== undefined && copiaOverride !== null) ? copiaOverride : EMAIL_COPIA;
  if (finalCc && String(finalCc).trim() !== '') {
    mailOptions.cc = String(finalCc).trim();
  }

  MailApp.sendEmail(mailOptions);
  
  // Após enviar o e-mail com os arquivos, excluir as fotos do Google Drive para poupar espaço
  try {
    const IMAGE_HEADERS = [
      'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 1', 
      'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 2', 
      'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 3', 
      'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 4'
    ];
    IMAGE_HEADERS.forEach(function(hdr) {
      var fileName = String(data[hdr] || '').trim();
      if (fileName) {
        var files = imageFolder.getFilesByName(fileName);
        while (files.hasNext()) {
          var f = files.next();
          f.setTrashed(true);
        }
      }
    });

    if (reqFiles && reqFiles.length > 0) {
      reqFiles.forEach(function(rf) {
        if (rf.name) {
          var files = imageFolder.getFilesByName(rf.name);
          while (files.hasNext()) {
            var f = files.next();
            f.setTrashed(true);
          }
        }
      });
    }
  } catch(eDel) {
    console.error("Erro ao apagar fotos do Drive após envio de e-mail: " + eDel.toString());
  }
}

function gerarPdfHtmlAvaliacao(data, memoryFiles, imageFolder) {
  var dataEmissao = new Date().toLocaleString('pt-BR');

  function isExcludedKey(k) {
    var keyUpper = String(k || '').trim().toUpperCase();
    if (!keyUpper) return true;
    if (keyUpper === 'ID' || keyUpper === 'ID_SISTEMA' || keyUpper === 'ID SISTEMA' || keyUpper === 'PROCESSED_SCRIPT' || keyUpper === 'ROW_INDEX') return true;
    if (keyUpper.indexOf('MERGED DOC') !== -1) return true;
    if (keyUpper.indexOf('DOCUMENT MERGE') !== -1) return true;
    if (keyUpper.indexOf('LINK TO MERGED') !== -1) return true;
    if (keyUpper.indexOf('ANÁLISE COMPORTAMENTO DIREÇÃO') !== -1 && (keyUpper.indexOf('URL') !== -1 || keyUpper.indexOf('ID') !== -1 || keyUpper.indexOf('LINK') !== -1 || keyUpper.indexOf('STATUS') !== -1)) return true;
    if (keyUpper.indexOf('ANÁLISE COMPORTAMENTAL DO MOTORISTA') !== -1 && (keyUpper.indexOf('URL') !== -1 || keyUpper.indexOf('ID') !== -1 || keyUpper.indexOf('LINK') !== -1 || keyUpper.indexOf('STATUS') !== -1)) return true;
    
    // Excluir metadados e resumos finais do loop de perguntas para garantir que as 30 perguntas apareçam corretamente
    var excludeList = [
      'MOTORISTA', 'AVALIADOR', 'TRANSPORTADORA', 'EMPRESA', 'FROTA', 'PLACA', 'VEICULO', 'VEÍCULO',
      'BASE', 'UNIDADE', 'DATA', 'DATA AVALIAÇÃO', 'DATA AVALIACAO', 'HORA', 'HORÁRIO', 'LOCAL', 'TRECHO',
      'LOCAL/TRECHO', 'LOCAL / TRECHO', 'LOCAL DA AVALIAÇÃO',
      'PLANO DE AÇÃO', 'PLANO DE ACAO', 'PRAZO', 'STATUS', 'RESPONSÁVEL', 'RESPONSAVEL', 'LUCAS DANIEL',
      'RESULTADO GERAL DO ACOMPANHAMENTO', 'RESULTADO GERAL', 'RESULTADO (%)', 'RESULTADO',
      'PONTOS POR HORA', 'PONTUAÇÃO', 'PONTUACAO', 'PONTOS',
      'NOME SUPERVISOR', 'SUPERVISOR', 'FUNÇÃO', 'FUNCAO', 'OBSERVAÇÕES', 'OBSERVAÇÃO', 'OBSERVACAO', 'COMENATÁRIOS', 'COMETÁRIOS',
      'CONVERSA DE FEEDBACK', 'DECLARAÇÃO DO MOTORISTA', 'DECLARACAO DO MOTORISTA'
    ];

    for (var i = 0; i < excludeList.length; i++) {
      if (keyUpper === excludeList[i]) return true;
    }

    return false;
  }

  var IMAGE_HEADERS = [
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 1', 
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 2', 
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 3', 
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 4'
  ];

  var motorista = String(data['MOTORISTA'] || data['Motorista'] || 'N/A').trim().toUpperCase();
  var avaliador = String(data['AVALIADOR'] || data['Avaliador'] || 'N/A').trim().toUpperCase();
  var transportadora = String(data['TRANSPORTADORA'] || data['Transportadora'] || data['EMPRESA'] || 'RISEL COMBUSTÍVEIS').trim().toUpperCase();
  var frota = String(data['FROTA'] || data['Frota'] || data['VEÍCULO'] || data['PLACA'] || 'N/A').trim().toUpperCase();

  var dataAvalRaw = data['DATA AVALIAÇÃO'] || data['Data Avaliação'] || data['DATA AVALIACAO'] || data['DATA'] || '';
  var dataAval = 'N/A';
  if (dataAvalRaw instanceof Date) {
    dataAval = Utilities.formatDate(dataAvalRaw, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } else if (typeof dataAvalRaw === 'string' && dataAvalRaw.trim() !== '') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataAvalRaw.trim())) {
      var pData = dataAvalRaw.trim().split('-');
      dataAval = pData[2] + '/' + pData[1] + '/' + pData[0];
    } else {
      dataAval = dataAvalRaw.trim();
    }
  }

  var localTrecho = String(data['LOCAL / TRECHO'] || data['LOCAL/TRECHO'] || data['LOCAL DA AVALIAÇÃO'] || data['LOCAL'] || data['TRECHO'] || 'N/A').trim().toUpperCase();

  var resultadoVal = String(data['RESULTADO GERAL DO ACOMPANHAMENTO'] || data['RESULTADO GERAL'] || data['RESULTADO'] || '100%').trim();
  if (typeof resultadoVal === 'number') {
    resultadoVal = (resultadoVal * 100).toFixed(2) + '%';
  } else if (typeof data['RESULTADO'] === 'number') {
    resultadoVal = (data['RESULTADO'] * 100).toFixed(2) + '%';
  }

  var pontosVal = String(data['PONTOS POR HORA'] || data['PONTUAÇÃO'] || data['Pontos'] || data['PONTOS'] || '0').trim();

  var observacaoVal = String(
    data['OBSERVAÇÕES'] || data['Observações'] || data['OBSERVAÇÃO'] || data['Observação'] || data['COMENATÁRIOS'] || 'Nenhum comentário registrado.'
  ).trim();

  var gestorNome = String(data['NOME SUPERVISOR'] || data['SUPERVISOR'] || data['GESTOR'] || data['NOME DO GESTOR'] || avaliador).trim().toUpperCase();
  var gestorFuncao = String(data['FUNÇÃO'] || data['FUNCAO'] || 'SUPERVISOR DE OPERAÇÕES').trim().toUpperCase();

  // Coleta de todas as 30 perguntas
  var initialKeys = ['MOTORISTA', 'AVALIADOR', 'TRANSPORTADORA', 'EMPRESA', 'FROTA', 'PLACA', 'VEICULO', 'VEÍCULO', 'BASE', 'UNIDADE', 'DATA', 'DATA AVALIAÇÃO', 'DATA AVALIACAO', 'HORA', 'HORÁRIO', 'LOCAL', 'TRECHO', 'LOCAL/TRECHO', 'LOCAL / TRECHO', 'LOCAL DA AVALIAÇÃO'];
  var questionsList = [];
  var qCounter = 0;

  for (var k in data) {
    var keyClean = String(k).trim();
    if (isExcludedKey(keyClean) || IMAGE_HEADERS.includes(keyClean)) continue;

    var keyUpper = keyClean.toUpperCase();
    if (initialKeys.some(function(ik) { return keyUpper.indexOf(ik) !== -1; })) continue;

    if (qCounter < 30) {
      qCounter++;
      var rawVal = data[k];
      var valStr = (rawVal ?? '').toString().trim();
      questionsList.push({ num: qCounter, key: keyClean, value: valStr });
    }
  }

  // Montagem do HTML de perguntas com cabeçalhos gradientes verdes atualizados
  var tableRowsHtml = '';
  for (var q = 0; q < questionsList.length; q++) {
    var qObj = questionsList[q];
    var qNum = qObj.num;

    // Seção 1 (Pergunta 1 e 2): ANTES DO INÍCIO DA VIAGEM
    if (qNum === 1) {
      tableRowsHtml += '<tr><td colspan="2" style="padding: 10px 0 6px 0; border: none; background: transparent;"><div style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 7px 12px; border-radius: 6px; letter-spacing: 0.5px;">ANTES DO INÍCIO DA VIAGEM</div></td></tr>';
    } 
    // Seção 2 (Pergunta 3 até 28): PROCEDIMENTOS DA EMPRESA (sem divisoria no item 13)
    else if (qNum === 3) {
      tableRowsHtml += '<tr><td colspan="2" style="padding: 10px 0 6px 0; border: none; background: transparent;"><div style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 7px 12px; border-radius: 6px; letter-spacing: 0.5px;">PROCEDIMENTOS DA EMPRESA</div></td></tr>';
    } 
    // Seção 3 (Pergunta 29 e 30): UTILIZAÇÃO DAS CÂMERAS EMBARCADAS
    else if (qNum === 29) {
      tableRowsHtml += '<tr><td colspan="2" style="padding: 10px 0 6px 0; border: none; background: transparent;"><div style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 7px 12px; border-radius: 6px; letter-spacing: 0.5px;">UTILIZAÇÃO DAS CÂMERAS EMBARCADAS</div></td></tr>';
    }

    var valUpper = qObj.value.toUpperCase();
    var badgeStyle = 'background: #f1f5f9; color: #0f172a; font-weight: 700; font-size: 10.5px; padding: 5px 3px; border-radius: 4px; text-align: center; width: 100%; box-sizing: border-box;';

    if (valUpper === 'SIM') {
      badgeStyle = 'background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; font-weight: 900; font-size: 10.5px; padding: 5px 3px; border-radius: 4px; text-transform: uppercase; text-align: center; width: 100%; box-sizing: border-box;';
    } else if (valUpper === 'NÃO' || valUpper === 'NAO') {
      badgeStyle = 'background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; font-weight: 900; font-size: 10.5px; padding: 5px 3px; border-radius: 4px; text-transform: uppercase; text-align: center; width: 100%; box-sizing: border-box;';
    } else if (valUpper === 'NA' || valUpper === 'N/A') {
      badgeStyle = 'background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; font-weight: 900; font-size: 10.5px; padding: 5px 3px; border-radius: 4px; text-transform: uppercase; text-align: center; width: 100%; box-sizing: border-box;';
    }

    var badgeHtml = '<div style="' + badgeStyle + '">' + (qObj.value || '-') + '</div>';
    var rowBg = (q % 2 === 0) ? '#ffffff' : '#f8fafc';

    tableRowsHtml += '<tr style="background-color: ' + rowBg + ';">' +
      '<td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 10.5px; font-weight: bold; color: #1e293b; width: 78%; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif;">' + qObj.key + '</td>' +
      '<td style="padding: 3px; border: 1px solid #e2e8f0; font-size: 10.5px; text-align: center; width: 22%; vertical-align: middle;">' + badgeHtml + '</td>' +
    '</tr>';
  }

  // Processamento das Imagens
  var imgBlocks = [];
  IMAGE_HEADERS.forEach(function(hdr) {
    var fileName = String(data[hdr] || '').trim();
    if (fileName) {
      var base64 = obterImagemBase64(fileName, memoryFiles, imageFolder);
      if (base64) imgBlocks.push({ base64: base64 });
    }
  });

  var imagesHtml = '';
  if (imgBlocks.length > 0) {
    imagesHtml += '<div style="margin-top: 18px; margin-bottom: 16px; page-break-inside: avoid;">' +
      '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: bold; color: #006633; text-transform: uppercase; border-left: 4px solid #006633; padding-left: 8px; margin-bottom: 10px; letter-spacing: 0.5px;">EVIDÊNCIAS E REGISTROS FOTOGRÁFICOS</div>' +
      '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed; width: 100%;">';

    for (var i = 0; i < imgBlocks.length; i += 2) {
      imagesHtml += '<tr>';
      var b1 = imgBlocks[i];
      imagesHtml += '<td width="49%" valign="top" style="width: 49%;">' +
        '<div style="margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; background: #ffffff; text-align: center; page-break-inside: avoid;">' +
          '<div style="border-radius: 6px; overflow: hidden; background: #f8fafc; text-align: center; height: 180px; width: 100%; display: flex; align-items: center; justify-content: center;">' +
            '<img src="' + b1.base64 + '" style="max-width: 100%; max-height: 180px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto; border: 0;" />' +
          '</div>' +
        '</div>' +
      '</td>';

      if (i + 1 < imgBlocks.length) {
        var b2 = imgBlocks[i+1];
        imagesHtml += '<td width="2%" style="width: 2%;"></td>';
        imagesHtml += '<td width="49%" valign="top" style="width: 49%;">' +
          '<div style="margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; background: #ffffff; text-align: center; page-break-inside: avoid;">' +
            '<div style="border-radius: 6px; overflow: hidden; background: #f8fafc; text-align: center; height: 180px; width: 100%; display: flex; align-items: center; justify-content: center;">' +
              '<img src="' + b2.base64 + '" style="max-width: 100%; max-height: 180px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto; border: 0;" />' +
            '</div>' +
          '</div>' +
        '</td>';
      } else {
        imagesHtml += '<td width="51%" style="width: 51%;"></td>';
      }
      imagesHtml += '</tr>';
    }
    imagesHtml += '</table></div>';
  }

  // 1. Tabela PLANO DE AÇÃO (3 linhas)
  var planoAcaoHtml = '<div style="margin-top: 18px; margin-bottom: 16px; page-break-inside: avoid;">' +
    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1;">' +
      '<thead>' +
        '<tr style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff;">' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 40%; text-align: left; font-family: \'Aptos Narrow\', sans-serif;">PLANO DE AÇÃO</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 18%; text-align: center; font-family: \'Aptos Narrow\', sans-serif;">PRAZO</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 18%; text-align: center; font-family: \'Aptos Narrow\', sans-serif;">STATUS</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 24%; text-align: left; font-family: \'Aptos Narrow\', sans-serif;">RESPONSÁVEL</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        '<tr style="height: 26px;"><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td></tr>' +
        '<tr style="height: 26px; background-color: #f8fafc;"><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td></tr>' +
        '<tr style="height: 26px;"><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td><td style="border: 1px solid #cbd5e1; padding: 4px;">&nbsp;</td></tr>' +
      '</tbody>' +
    '</table>' +
  '</div>';

  // 2. Card de OBSERVAÇÕES
  var observacoesHtml = '<div style="margin-bottom: 16px; page-break-inside: avoid;">' +
    '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: bold; color: #006633; text-transform: uppercase; border-left: 4px solid #006633; padding-left: 8px; margin-bottom: 6px; letter-spacing: 0.5px;">OBSERVAÇÕES</div>' +
    '<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #006633; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #0f172a; line-height: 1.4; min-height: 32px; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif;">' + observacaoVal + '</div>' +
  '</div>';

  // 3. Quadros/Cards de PONTOS POR HORA e RESULTADO GERAL (Sem cabeçalho de tabela, altura ampliada para destaque)
  var pontosResultadoHtml = '<div style="margin-top: 18px; margin-bottom: 16px; page-break-inside: avoid;">' +
    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed; width: 100%;">' +
      '<tr>' +
        '<td width="48%" valign="top">' +
          '<div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #006633; border-radius: 10px; padding: 14px 16px; text-align: center; box-sizing: border-box;">' +
            '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 10px; font-weight: 800; color: #006633; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">PONTOS POR HORA / PONTUAÇÃO</div>' +
            '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 24px; font-weight: 900; color: #006633; margin-top: 2px;">' + pontosVal + '</div>' +
          '</div>' +
        '</td>' +
        '<td width="4%"></td>' +
        '<td width="48%" valign="top">' +
          '<div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #16a34a; border-radius: 10px; padding: 14px 16px; text-align: center; box-sizing: border-box;">' +
            '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 10px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">RESULTADO GERAL DO ACOMPANHAMENTO</div>' +
            '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 28px; font-weight: 900; color: #16a34a; margin-top: 2px;">' + resultadoVal + '</div>' +
          '</div>' +
        '</td>' +
      '</tr>' +
    '</table>' +
  '</div>';

  // 4. CONVERSA DE FEEDBACK (Com nome do Gestor direto preenchido)
  var conversaFeedbackHtml = '<div style="margin-bottom: 16px; page-break-inside: avoid;">' +
    '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: bold; color: #006633; text-transform: uppercase; border-left: 4px solid #006633; padding-left: 8px; margin-bottom: 6px; letter-spacing: 0.5px;">CONVERSA DE FEEDBACK</div>' +
    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1;">' +
      '<thead>' +
        '<tr style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff;">' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 18%; text-align: center; font-family: \'Aptos Narrow\', sans-serif;">DATA</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 34%; text-align: left; font-family: \'Aptos Narrow\', sans-serif;">NOME DO GESTOR</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 22%; text-align: left; font-family: \'Aptos Narrow\', sans-serif;">FUNÇÃO</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 26%; text-align: center; font-family: \'Aptos Narrow\', sans-serif;">ASSINATURA</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        '<tr style="height: 38px; background-color: #ffffff;">' +
          '<td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10.5px; text-align: center; vertical-align: middle; font-family: \'Aptos Narrow\', sans-serif;">' + dataAval + '</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; vertical-align: middle; font-family: \'Aptos Narrow\', sans-serif;">' + gestorNome + '</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; vertical-align: middle; font-family: \'Aptos Narrow\', sans-serif;">' + gestorFuncao + '</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 4px; vertical-align: middle;">&nbsp;</td>' +
        '</tr>' +
      '</tbody>' +
    '</table>' +
  '</div>';

  // 5. DECLARAÇÃO DO MOTORISTA
  var declaracaoMotoristaHtml = '<div style="margin-bottom: 16px; page-break-inside: avoid;">' +
    '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 6px;">Declaro que recebi todas as informações acima:</div>' +
    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1;">' +
      '<thead>' +
        '<tr style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff;">' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 50%; text-align: left; font-family: \'Aptos Narrow\', sans-serif;">NOME MOTORISTA</th>' +
          '<th style="padding: 6px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 50%; text-align: center; font-family: \'Aptos Narrow\', sans-serif;">ASSINATURA</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        '<tr style="height: 38px; background-color: #ffffff;">' +
          '<td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; vertical-align: middle; font-family: \'Aptos Narrow\', sans-serif;">' + motorista + '</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 4px; vertical-align: middle;">&nbsp;</td>' +
        '</tr>' +
      '</tbody>' +
    '</table>' +
  '</div>';

  // Montagem final do HTML do Relatório em PDF
  var htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Avaliação de Direção</title><style>@page { size: A4; margin: 10mm 10mm 10mm 10mm; } body { font-family: \'Aptos Narrow\', \'Arial Narrow\', Arial, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 0; }</style></head><body>' +
    '<div style="height: 5px; background: linear-gradient(90deg, #006633 0%, #F99D1C 100%); margin-bottom: 10px; border-radius: 3px;"></div>' +
    '<div style="border-bottom: 2px solid #006633; padding-bottom: 8px; margin-bottom: 14px;">' +
      '<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>' +
        '<td width="65%" valign="middle" align="left"><h1 style="margin: 0; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 16px; font-weight: 900; color: #006633; letter-spacing: -0.3px; text-transform: uppercase;">RISEL COMBUSTÍVEIS</h1><p style="margin: 2px 0 0 0; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 10px; font-weight: bold; color: #F99D1C; text-transform: uppercase;">SISTEMA DE MONITORAMENTO E AVALIAÇÃO DE DIREÇÃO</p></td>' +
        '<td width="35%" align="right" valign="middle" style="font-family: monospace; font-size: 8px; color: #64748b; text-align: right;"><div><strong>EMISSÃO:</strong> ' + dataEmissao + '</div><div><strong>SISTEMA:</strong> MONITORAMENTO RISEL</div></td>' +
      '</tr></table>' +
    '</div>' +

    // Informações Iniciais Antes das Perguntas
    '<div style="margin-bottom: 14px;">' +
      '<div style="background-color: #f8fafc; border: 1.5px solid #006633; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px;"><span style="font-size: 8.5px; color: #006633; font-weight: bold; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">👤 MOTORISTA</span><div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">' + motorista + '</div></div>' +
      '<div style="background-color: #f8fafc; border: 1.5px solid #006633; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;"><span style="font-size: 8.5px; color: #006633; font-weight: bold; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">📋 AVALIADOR</span><div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">' + avaliador + '</div></div>' +
      '<div style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); color: #ffffff; font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 7px 12px; border-radius: 6px; text-align: center; letter-spacing: 0.5px; margin-bottom: 6px;">INFORMAÇÕES DA DESCARGA</div>' +
      '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 5px;"><span style="font-size: 8.5px; color: #475569; font-weight: bold; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">🏢 TRANSPORTADORA</span><div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 1px; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">' + transportadora + '</div></div>' +
      '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 5px;"><span style="font-size: 8.5px; color: #475569; font-weight: bold; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">🚛 FROTA</span><div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 1px; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">' + frota + '</div></div>' +
      '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 5px;"><span style="font-size: 8.5px; color: #475569; font-weight: bold; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">📅 DATA DA AVALIAÇÃO</span><div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 1px; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">' + dataAval + '</div></div>' +
      '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px;"><span style="font-size: 8.5px; color: #475569; font-weight: bold; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">🗺️ LOCAL / TRECHO</span><div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 1px; text-transform: uppercase; font-family: \'Aptos Narrow\', sans-serif;">' + localTrecho + '</div></div>' +
    '</div>' +

    // Tabela de Perguntas 1 a 30
    '<div style="font-family: \'Aptos Narrow\', \'Arial Narrow\', sans-serif; font-size: 11.5px; font-weight: bold; color: #006633; text-transform: uppercase; border-left: 4px solid #006633; padding-left: 8px; margin-top: 10px; margin-bottom: 10px; letter-spacing: 0.5px;">Detalhamento dos Itens Avaliados</div>' +
    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1;">' +
      '<thead><tr style="background-color: #006633; color: #ffffff;"><th style="padding: 7px 10px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 78%; font-family: \'Aptos Narrow\', sans-serif;">Item de Avaliação</th><th style="padding: 7px 10px; text-align: center; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #006633; width: 22%; font-family: \'Aptos Narrow\', sans-serif;">Resultado / Resposta</th></tr></thead>' +
      '<tbody>' + tableRowsHtml + '</tbody>' +
    '</table>' +

    // Imagens
    imagesHtml +

    // Tabela Plano de Ação, Observações, Quadros de Nota, Feedback e Declaração
    planoAcaoHtml +
    observacoesHtml +
    pontosResultadoHtml +
    conversaFeedbackHtml +
    declaracaoMotoristaHtml +

    '</body></html>';

  var htmlOutput = HtmlService.createHtmlOutput(htmlContent);
  return htmlOutput.getAs(MimeType.PDF);
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function obterPastaDriveSegura(folderId, nomePadrao) {
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch(e) {}
  }
  try {
    var folders = DriveApp.getFoldersByName(nomePadrao || "Anexos_Monitoramento");
    if (folders.hasNext()) {
      return folders.next();
    }
    return DriveApp.createFolder(nomePadrao || "Anexos_Monitoramento");
  } catch(e2) {
    return DriveApp.getRootFolder();
  }
}

function obterArquivoTemplateSeguro(fileId, nomeModelo) {
  if (fileId) {
    try {
      return DriveApp.getFileById(fileId);
    } catch(e) {}
  }
  try {
    var files = DriveApp.getFilesByName(nomeModelo);
    if (files.hasNext()) {
      return files.next();
    }
  } catch(e2) {}
  return null;
}

function criarDocumentoRelatorioDinamico(tituloDoc, data, outputFolder, memoryFiles, imageFolder, imageAttachments) {
  var doc = DocumentApp.create(tituloDoc);
  var body = doc.getBody();
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(36).setMarginRight(36);

  var pTitle = body.appendParagraph("RISEL COMBUSTÍVEIS - AVALIAÇÃO DE DIREÇÃO");
  pTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  pTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  pTitle.setFontFamily("Arial");

  var motorista = String(data['MOTORISTA'] || data['Motorista'] || 'N/A').trim();
  var avaliador = String(data['AVALIADOR'] || data['Avaliador'] || 'N/A').trim();
  var frota = String(data['FROTA'] || data['Frota'] || 'N/A').trim();
  var dataAval = String(data['DATA AVALIAÇÃO'] || data['Data Avaliação'] || 'N/A').trim();
  var resultado = String(data['RESULTADO'] || data['Resultado'] || 'N/D').trim();

  var pSub = body.appendParagraph(`Motorista: ${motorista}  |  Avaliador: ${avaliador}  |  Frota: ${frota}  |  Data: ${dataAval}  |  Nota: ${resultado}`);
  pSub.setBold(true);
  pSub.setFontSize(10);
  pSub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendHorizontalRule();

  var IMAGE_HEADERS = [
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 1', 
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 2', 
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 3', 
    'REGISTROS DE VERIFICAÇÃO DAS IMAGENS 4'
  ];

  var tableData = [["ITEM DE AVALIAÇÃO", "RESPOSTA / VALOR"]];
  
  for (var k in data) {
    var keyClean = String(k).trim();
    if (!keyClean || keyClean === 'PROCESSED_SCRIPT' || keyClean === 'ROW_INDEX') continue;
    
    var val = String(data[k] ?? '').trim();
    if (IMAGE_HEADERS.includes(keyClean)) {
      if (val) {
        var blob = buscarBlobFlexivel(imageFolder, val, memoryFiles);
        if (blob) {
          imageAttachments.push(blob);
          tableData.push([keyClean, "[Imagem Anexa: " + val + "]"]);
        } else {
          tableData.push([keyClean, val]);
        }
      }
      continue;
    }
    tableData.push([keyClean, val]);
  }

  var table = body.appendTable(tableData);
  table.setBorderColor("#CCCCCC");

  // Formatar primeira linha (Cabeçalho da tabela)
  var headerRow = table.getRow(0);
  for (var c = 0; c < headerRow.getNumCells(); c++) {
    var cell = headerRow.getCell(c);
    cell.setBackgroundColor(COR_RISEL_VERDE);
    cell.getChild(0).asText().setForegroundColor(COR_FONTE_BRANCA).setBold(true);
  }

  // Formatar respostas SIM/NÃO/NA nas células
  for (var r = 1; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    var valCell = row.getCell(1);
    var textVal = valCell.getText().trim().toUpperCase();

    if (['SIM', 'NÃO', 'NAO', 'NA'].includes(textVal)) {
      var color = (textVal === 'SIM') ? COR_RISEL_VERDE : (textVal === 'NA') ? COR_RISEL_AZUL : COR_RISEL_LARANJA;
      valCell.setBackgroundColor(color);
      valCell.getChild(0).asText().setForegroundColor(COR_FONTE_BRANCA).setBold(true);
    }
  }

  doc.saveAndClose();

  var file = DriveApp.getFileById(doc.getId());
  if (outputFolder) {
    try {
      file.moveTo(outputFolder);
    } catch(eMove) {}
  }
  return file;
}

function getHtmlEmailBody(d) {
  var motorista = d.motorista || 'N/A';
  var avaliador = d.avaliador || 'N/A';
  var transportadora = d.transportadora || 'RISEL COMBUSTÍVEIS';
  var frota = d.frota || 'N/A';
  var dataAval = d.dataAval || 'N/A';
  var local = d.local || 'N/A';
  var resultado = d.resultado || '100%';
  var pontos = d.pontos || '0';
  var obs = d.observacao || 'Sem observações registradas.';

  return `
    <div style="font-family: 'Aptos Narrow', 'Arial Narrow', 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #f4f7f6; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e0e0e0;">
        <!-- Header -->
        <div style="background: linear-gradient(90deg, #006633 0%, #004d26 100%); padding: 18px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'Aptos Narrow', 'Arial Narrow', sans-serif;">Avaliação de Direção</h1>
          <p style="color: #a8d5ba; margin: 3px 0 0 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Sistema de Monitoramento Risel Combustíveis</p>
        </div>

        <div style="padding: 22px;">
          <!-- Informações em Cards Informativos -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-bottom: 15px;">
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #006633; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 9px; color: #006633; text-transform: uppercase; font-weight: 800; font-family: 'Aptos Narrow', sans-serif;">👤 MOTORISTA</div>
                <div style="font-size: 13px; color: #0f172a; font-weight: 800; text-transform: uppercase; margin-top: 1px;">${motorista}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #006633; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 9px; color: #006633; text-transform: uppercase; font-weight: 800; font-family: 'Aptos Narrow', sans-serif;">📋 AVALIADOR</div>
                <div style="font-size: 13px; color: #0f172a; font-weight: 800; text-transform: uppercase; margin-top: 1px;">${avaliador}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #006633; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 9px; color: #006633; text-transform: uppercase; font-weight: 800; font-family: 'Aptos Narrow', sans-serif;">🏢 TRANSPORTADORA</div>
                <div style="font-size: 12px; color: #0f172a; font-weight: 700; text-transform: uppercase; margin-top: 1px;">${transportadora}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #006633; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 9px; color: #006633; text-transform: uppercase; font-weight: 800; font-family: 'Aptos Narrow', sans-serif;">🚛 FROTA</div>
                <div style="font-size: 12px; color: #0f172a; font-weight: 700; text-transform: uppercase; margin-top: 1px;">${frota}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #006633; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 9px; color: #006633; text-transform: uppercase; font-weight: 800; font-family: 'Aptos Narrow', sans-serif;">📅 DATA DA AVALIAÇÃO</div>
                <div style="font-size: 12px; color: #0f172a; font-weight: 700; text-transform: uppercase; margin-top: 1px;">${dataAval}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #006633; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 9px; color: #006633; text-transform: uppercase; font-weight: 800; font-family: 'Aptos Narrow', sans-serif;">🗺️ LOCAL / TRECHO</div>
                <div style="font-size: 12px; color: #0f172a; font-weight: 700; text-transform: uppercase; margin-top: 1px;">${local}</div>
              </td>
            </tr>
          </table>

          <!-- Card do Resultado Geral & Pontos -->
          <div style="margin-top: 18px; background-color: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 10px; padding: 14px; text-align: center;">
            <div style="font-size: 10px; color: #15803d; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">RESULTADO GERAL DO ACOMPANHAMENTO</div>
            <div style="font-size: 32px; color: #006633; font-weight: 900; margin: 4px 0;">${resultado}</div>
            <div style="font-size: 11px; color: #334155; font-weight: 700; margin-top: 4px;">Pontos por Hora: <span style="color: #006633; font-weight: 900;">${pontos}</span></div>
          </div>

          <!-- Observações -->
          <div style="margin-top: 18px;">
            <div style="font-size: 10px; color: #006633; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">💬 OBSERVAÇÕES DO ACOMPANHAMENTO</div>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #334155; line-height: 1.4;">
              ${obs}
            </div>
          </div>
        </div>

        <!-- Rodapé -->
        <div style="background-color: #f9f9f9; padding: 12px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="font-size: 9px; color: #888888; margin: 0; text-transform: uppercase; font-weight: 700;">Sistema de Monitoramento Risel Combustíveis — Notificação Automática</p>
        </div>
      </div>
    </div>`;
}

function ensureControlColumnIsReady(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let idx = headers.indexOf(PROCESSED_COLUMN_HEADER);
  if (idx !== -1) return idx + 1;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue(PROCESSED_COLUMN_HEADER);
  return sheet.getLastColumn();
}

function doGet(e) {
  if (e && e.parameter && e.parameter.file) {
    try {
      var imageFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
      var files = imageFolder.getFilesByName(e.parameter.file);
      if (files.hasNext()) {
        var file = files.next();
        var base64Data = Utilities.base64Encode(file.getBlob().getBytes());
        var res = {
          status: "OK",
          base64: "data:" + file.getMimeType() + ";base64," + base64Data
        };
        return ContentService.createTextOutput(JSON.stringify(res))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", message: "Arquivo nao encontrado" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", message: "Parametro file ausente" }))
    .setMimeType(ContentService.MimeType.JSON);
}
