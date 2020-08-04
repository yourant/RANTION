/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record'],
  function (search, record) {
    function execute (context) {
      var jo2_id = []
      log.debug('execute  context', context)
      var limi = 2000
      search.create({
        type: 'journalentry',
        filters: [
          ['memomain', 'contains', '结算'],
        //   'and',
        //   ['custbody_coll_s', 'noneof', '@NONE@'],
          'and',
          ['mainline', 'is', true],
          'and',
          ['custbody_jourentry_relative_checked', 'is', false]
        ],columns: [
          {name: 'internalid',summary: 'group'}
        ]
      }).run().each(function (result) {
        jo2_id.push(result.getValue(result.columns[0]))
        return --limi > 0
      })
      var jo2_rec, jo3, jo1_arrys, settlmenid_arrys
      var fils1, fils2
      var jo1_arrys_len, l
      var jo1_s,inv_objs
      var set_rs = true
      log.debug('jo2_id.length ' + jo2_id.length)
      try {
        jo2_id.map(function (jo2) {
          log.debug('冲销日记账', jo2)
          jo2_rec = record.load({ type: 'journalentry', id: jo2 })
          jo3 = jo2_rec.getValue('custbody_coll_s')
          jo1_arrys = jo2_rec.getValue('custbody_estimate_s')
          inv_objs = JSON.parse(jo2_rec.getValue('custbody_settlement_inv_ids'))
          log.debug("inv_objs",inv_objs);
          for (var key in inv_objs) {
            inv_objs[key].map(function (inv_ojbs) {
              record.submitFields({
                type: 'invoice',
                id: inv_ojbs.inv_id,
                values: {
                  memo: key,
                  custbody_dp_expected_due_date: inv_ojbs.end_date,
                  custbody_setllement_depositamount: inv_ojbs.depAmaount,
                }
              })
            })
          }
          settlmenid_arrys = jo2_rec.getValue('custbody_set_payment_report_recids')
          if (settlmenid_arrys) {
            settlmenid_arrys = JSON.parse(settlmenid_arrys)
            set_rs = setTruesettlment(settlmenid_arrys)
          }
          if (jo1_arrys.length > 0) {
            fils1 = [
              [
                ['custbody_coll_s', 'anyof', '@NONE@'], 'or',
                ['custbody_blot_s', 'anyof', '@NONE@']
              ]
            ]
            log.debug('jo1_arrys:', jo1_arrys)

            fils2 = []
            fils1.push('and')
            l = 0
            if (Object.prototype.toString.call(jo1_arrys) == '[object Array]') {
              jo1_arrys_len = jo1_arrys.length
              jo1_arrys.map(function (j1) {
                l++
                fils2.push(
                  ['internalidnumber', 'equalto', j1]
                )
                if (l < jo1_arrys_len)
                  fils2.push('or')
              })
            } else {
              fils2.push(
                ['internalidnumber', 'equalto', jo1_arrys]
              )
            }

            fils1.push(fils2)
            log.debug('fils1', fils1)
            jo1_s = []
            search.create({
              type: 'journalentry',
              filters: fils1,
              columns: [{ name: 'internalid', summary: 'GROUP' }]
            }).run().each(function (e) {
              jo1_s.push(e.getValue(e.columns[0]))
              return --limi > 0
            })
            log.debug('搜索出来的jo1 id ', jo1_s)
            jo1_s.map(function (jo1_id) {
              record.submitFields({
                type: 'journalentry',
                id: jo1_id,
                values: {
                  custbody_estimate_s: jo1_id,
                  custbody_blot_s: jo2,
                  custbody_coll_s: jo3
                }
              })
            })
            if (jo1_s.length == 0 && set_rs)
              record.submitFields({
                type: 'journalentry',
                id: jo2,
                values: {
                  custbody_jourentry_relative_checked: true
                }
              })
          } else {
            record.submitFields({
              type: 'journalentry',
              id: jo2,
              values: {
                custbody_jourentry_relative_checked: true
              }
            })
          }
        })
      } catch (error) {
        log.error('出错拉', error)
      }

      log.audit('处理完成')
    }

    function setTruesettlment (settlement_ids) {
      var fils = [
          ['custrecord_settle_is_generate_voucher', 'is', false]
        ], fils2 = [], set_arrys = []
      var settlement_ids_len = settlement_ids.length, lse = 0
      if (settlement_ids_len > 0)
        fils.push('and')
      settlement_ids.map(function (se) {
        lse++
        fils2.push(
          ['internalidnumber', 'equalto', se]
        )
        if (lse < settlement_ids_len)
          fils2.push('or')
      })
      fils.push(fils2)
      log.debug('fils', fils)
      search.create({
        type: 'customrecord_aio_amazon_settlement',
        filters: fils
      }).run().each(function (e) {
        set_arrys.push(e.id)
        return true
      })
      log.debug('搜索出来的settlment_rec id:', set_arrys)
      set_arrys.map(function (s) {
        record.submitFields({
          type: 'customrecord_aio_amazon_settlement',
          id: s,
          values: {
            custrecord_settle_is_generate_voucher: true,
            custrecord_february_undeal: ''
          }
        })
      })
      if (set_arrys.length == 0)
        return true
      else
        return false
    }
    return {
      execute: execute
    }
  })
