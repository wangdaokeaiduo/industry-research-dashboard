import json, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
symbols={'sh600519':'贵州茅台','sz000858':'五粮液','sz000568':'泸州老窖','sh600809':'山西汾酒','sz000596':'古井贡酒','sh603369':'今世缘','sh600702':'舍得酒业','sz000799':'酒鬼酒'}
rows={}
for code in symbols:
    url=f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,2024-01-01,2026-08-10,900,qfq'
    with urllib.request.urlopen(url,timeout=20) as r: payload=json.load(r)
    raw=payload['data'][code].get('qfqday') or payload['data'][code]['day']
    rows[code]={x[0]:{'o':float(x[1]),'c':float(x[2]),'h':float(x[3]),'l':float(x[4]),'v':float(x[5])/10000} for x in raw}
dates=sorted(set.intersection(*(set(x) for x in rows.values())))[-400:]
index=100.; prices=[]; volumes=[]; ohlc=[]; prev={c:rows[c][dates[0]]['c'] for c in symbols}
for i,d in enumerate(dates):
    day=[rows[c][d] for c in symbols]
    if i==0: ro=rh=rl=rc=1
    else:
        ro=sum(rows[c][d]['o']/prev[c] for c in symbols)/len(symbols); rh=sum(rows[c][d]['h']/prev[c] for c in symbols)/len(symbols)
        rl=sum(rows[c][d]['l']/prev[c] for c in symbols)/len(symbols); rc=sum(rows[c][d]['c']/prev[c] for c in symbols)/len(symbols)
    op=index*ro; cl=index*rc; hi=max(index*rh,op,cl); lo=min(index*rl,op,cl); index=cl
    ohlc.append({'date':d,'open':round(op,2),'high':round(hi,2),'low':round(lo,2),'close':round(cl,2)})
    prices.append(round(cl,2)); volumes.append(round(sum(x['v'] for x in day),2)); prev={c:rows[c][d]['c'] for c in symbols}
ma=lambda n: round(sum(prices[-n:])/n,2); va=lambda n: round(sum(volumes[-n:])/n,2)
mas={n:ma(n) for n in [5,10,20,60,90,120,145,250]}; vmas={n:va(n) for n in [5,10,20,60,90,145]}
last=prices[-1]; vol=volumes[-1]; high=max(prices); low=min(prices); fib=[round(low+(high-low)*x,2) for x in [.382,.5,.618]]
short=last>mas[20] and last>mas[60]; long=last>mas[145]
rating='试仓' if short and long else ('观察' if short else '不适合左侧交易')
report={
'id':'baijiu-sector','industry':'白酒板块','category':'cycle','asOf':'2026-08-10','updatedAt':'2026-08-11T18:10:00+08:00',
'decisionOverview':{'items':[{'label':'产业价值','value':'中高','score':77,'comment':'名酒品牌、稀缺产区和渠道仍具长期壁垒'},{'label':'商业质量','value':'高但分化','score':80,'comment':'头部毛利与现金流强，腰尾部库存压力大'},{'label':'估值吸引力','value':'中高','score':72,'comment':'龙头估值回落，但盈利下修尚未完全结束'},{'label':'景气位置','value':'深度调整','score':38,'comment':'量价利承压，渠道仍在主动去库存'},{'label':'综合评级','value':'观察','score':61,'comment':'等待库存、批价与技术趋势共同确认'}],'coreConflict':'头部名酒具备强品牌、现金流和分红能力，但行业进入销量、价格、利润三重收缩，渠道库存和真实开瓶尚未完成出清。','action':'白酒适合建立长期观察池，但不宜把低估值等同于周期见底；优先高端龙头和强区域酒，回避依赖压货、价格倒挂和现金流恶化的公司。'},
'weeklyChanges':{'period':'首次建立','title':'首次建立白酒决策基线','summary':'本期首次建立结构化基线，下周将比较烟酒零售、渠道库存、批价、合同负债、现金流、估值和技术触发状态。','items':[]},
'prosperity':{'level':'低景气','direction':'L型筑底、头部分化','directionTone':'negative','score':38,'verdict':'2026年上半年烟酒类限额以上零售额同比增长13.2%，但酒业协会全产业链调研显示白酒仍处于量、价、利三重收缩，渠道主动去库存、价格倒挂和消费理性化延续。零售统计包含烟草且不能直接代表白酒真实开瓶，因此目前只能判断为深度调整中的局部企稳，尚非全面复苏。','dimensions':[{'name':'终端需求','value':'弱修复','change':'烟酒零售+13.2%，口径偏宽','tone':'warning'},{'name':'渠道库存','value':'高','change':'主动去库存仍在进行','tone':'negative'},{'name':'价格','value':'承压','change':'主流产品倒挂与批价重构','tone':'negative'},{'name':'利润','value':'分化','change':'高端韧性强、腰尾部下滑','tone':'warning'}],'driver':'宴席和大众自饮提供底盘，高端商务需求、居民收入与渠道信心决定上行弹性；供给侧则由品牌集中和酒企控货决定出清速度。','improvement':'主流单品批价连续三个月企稳、经销商库存回落至合理月数、合同负债和经营现金流不再恶化，且多数龙头利润预期停止下修。','deterioration':'节日动销弱于预期、批价再次快速下行、酒企继续向渠道压货，或核心公司现金流与合同负债同步恶化。'},
'summary':{'stage':'下行后段—主动去库存','rating':'观察；高端龙头优于板块整体','confidence':'中高','conclusion':f'白酒的长期投资价值仍在品牌、稀缺产区、渠道和现金分红，但当前行业处于深度存量调整，不是全行业反转。2026H1烟酒零售增长与白酒量价利承压并存，必须优先相信渠道库存、批价和现金流。8股等权篮子当前{last:.2f}，MA20/60/145为{mas[20]:.2f}/{mas[60]:.2f}/{mas[145]:.2f}，技术评级为“{rating}”。更合理的策略是观察高端龙头、清香龙头和强区域酒，等库存下降与放量突破{fib[0]:.2f}双确认后再升级动作。','evidence':['2026H1限额以上烟酒类零售额3547亿元，同比+13.2%，但包含烟草','中国酒业协会2026中期报告判断行业量、价、利三重收缩、渠道主动去库存','贵州茅台2026Q1营收539.09亿元同比+6.54%，净利润272.43亿元同比仅+1.47%']},
'cycle':{'current':'下行后段—主动去库存','stages':['繁荣扩张','渠道加库存','价格倒挂','销量与利润下行','下行后段—主动去库存','批价企稳','早期复苏']},
'reversalConditions':[
 {'name':'真实动销改善','dimension':'需求','current':'烟酒零售同比+13.2%，但白酒开瓶口径缺失','threshold':'核心品牌开瓶/终端动销连续两季同比转正','status':'partial','trend':'up','source':'国家统计局及行业调研，2026H1'},
 {'name':'渠道库存出清','dimension':'库存','current':'行业仍主动去库存；2025H1平均存货周转约900天','threshold':'经销商库存连续两个季度下降并回到合理月数','status':'unmet','trend':'down','source':'中国酒业协会2025/2026中期报告'},
 {'name':'主流批价企稳','dimension':'价格','current':'价格倒挂仍普遍，价格体系重建中','threshold':'飞天、普五、国窖等主流单品批价连续3个月不创新低','status':'partial','trend':'flat','source':'协会调研与渠道价格跟踪'},
 {'name':'龙头盈利企稳','dimension':'利润','current':'茅台26Q1收入+6.54%、净利+1.47%；行业分化','threshold':'多数核心公司利润预期停止下修且现金流改善','status':'partial','trend':'flat','source':'上市公司2026Q1报告'},
 {'name':'供给纪律改善','dimension':'供给','current':'部分企业控货、优化网点，但成品及基酒库存仍高','threshold':'酒企发货与终端动销匹配，不以压货换收入','status':'partial','trend':'up','source':'2026白酒市场中期报告'},
 {'name':'技术趋势反转','dimension':'市场定价','current':f'篮子{last:.2f}，MA20/60/145={mas[20]:.2f}/{mas[60]:.2f}/{mas[145]:.2f}','threshold':f'放量突破{fib[0]:.2f}且回踩不破','status':'met' if short and long else ('partial' if short else 'unmet'),'trend':'up' if short else 'flat','source':'腾讯证券前复权行情，截至2026-08-10'}],
'metrics':[{'label':'烟酒类零售额','value':'3,547','unit':'亿元/H1','change':'同比 +13.2%','direction':'up','series':[2731,3133,3547]},{'label':'行业周转天数','value':'900','unit':'天','change':'2025H1同比 +10%','direction':'down','series':[720,818,900]},{'label':'茅台2026Q1收入','value':'539.09','unit':'亿元','change':'同比 +6.54%','direction':'up','series':[457.76,506.01,539.09]},{'label':'茅台2026Q1净利','value':'272.43','unit':'亿元','change':'同比 +1.47%','direction':'up','series':[240.65,268.50,272.43]},{'label':'白酒篮子','value':f'{last:.2f}','unit':'点','change':'截至8月10日','direction':'up' if prices[-1]>prices[-20] else 'down','series':prices[-20:]},{'label':'量能/20日均量','value':f'{vol/vmas[20]:.2f}','unit':'倍','change':'突破确认需>1.2倍','direction':'up' if vol>vmas[20] else 'down','series':volumes[-20:]}],
'industryChain':[{'stage':'上游','title':'粮食、包材、基酒与产区资源','items':['高粱、小麦等粮食成本占比有限，优质基酒和产区生态更稀缺','陶坛、玻瓶、纸盒等包材影响库存和现金占用','基酒需要多年储存，形成时间壁垒，也可能形成高库存']},{'stage':'中游','title':'酒企、品牌与产品矩阵','items':['利润池集中于强品牌、高端大单品和区域根据地','酱香、浓香、清香并非天然等于成长，核心是品牌与真实动销','产能、基酒、产品结构、费用投放和渠道政策共同决定盈利']},{'stage':'下游','title':'经销商、终端与消费场景','items':['经销商承担库存和资金压力，是周期最敏感环节','商超、烟酒店、餐饮、电商和直营共同影响价盘','宴席、大众自饮较稳定；高端商务需求弹性更大']}],
'companyComparison':[
 {'tier':'核心配置','tone':'positive','company':'贵州茅台','ticker':'600519.SH','driver':'品牌稀缺、直营改革、现金流与高分红','valuation':'用可持续利润、FCF与股息率交叉验证','risk':'批价下行、非标产品调整和增速中枢下降'},
 {'tier':'核心观察','tone':'positive','company':'五粮液','ticker':'000858.SZ','driver':'千元价格带龙头、渠道改革和分红','valuation':'需对2025收入确认调整后的基数单独处理','risk':'会计口径调整、普五价盘和渠道信心'},
 {'tier':'核心观察','tone':'positive','company':'泸州老窖','ticker':'000568.SZ','driver':'国窖1573品牌与全国化渠道','valuation':'关注高端销量、现金流和合同负债','risk':'高端需求承压、费用投放'},
 {'tier':'成长弹性','tone':'warning','company':'山西汾酒','ticker':'600809.SH','driver':'清香龙头、全国化与产品结构升级','valuation':'成长溢价须由省外增速和青花占比支持','risk':'全国化放缓、费用率上升'},
 {'tier':'区域龙头','tone':'warning','company':'古井贡酒/今世缘','ticker':'000596.SZ / 603369.SH','driver':'安徽、江苏根据地和宴席消费','valuation':'看省内份额、次高端动销与现金回款','risk':'区域竞争、地产与宴席需求'},
 {'tier':'高风险反转','tone':'negative','company':'舍得酒业/酒鬼酒','ticker':'600702.SH / 000799.SZ','driver':'去库存后的低基数弹性','valuation':'先看经营现金流与合同负债，盈利未稳不机械看PE','risk':'库存、价盘、品牌势能与业绩继续下滑'}],
'valuationScenarios':[{'name':'乐观','weight':'25%','assumption':'库存显著下降，批价企稳，高端需求恢复','valuation':'龙头可按稳定FCF与股息率给予质量溢价','signal':'连续两季现金流和合同负债改善，盈利上修'},{'name':'基准','weight':'50%','assumption':'L型筑底，头部稳、次高端和区域酒分化','valuation':'用2026可持续利润而非历史高增速定价','signal':'库存缓降、批价止跌但销量温和'},{'name':'悲观','weight':'25%','assumption':'需求弱、倒挂扩大，酒企以费用和压货保收入','valuation':'盈利下修，估值安全边际继续上移','signal':'批价创新低、现金流和合同负债同步下降'}],
'catalysts':[{'date':'2026-08至09','event':'中报与中秋国庆备货','expectation':'渠道库存下降、回款与动销改善','status':'pending','statusLabel':'关键验证'},{'date':'2026Q4','event':'主流单品批价与控货效果','expectation':'价格倒挂收窄','status':'pending','statusLabel':'跟踪'},{'date':'2027春节','event':'旺季开瓶与经销商打款','expectation':'需求、库存和现金流形成共振','status':'pending','statusLabel':'核心节点'}],
'executionPlan':{'action':'观察；仅高质量龙头具备研究型左侧价值','trigger':f'行业库存下降、主流批价连续3个月企稳，同时篮子放量突破{fib[0]:.2f}','add':f'回踩MA60 {mas[60]:.2f}附近不破，且中报/三季报现金流和合同负债改善','priceInvalidation':f'篮子跌破样本低点{low:.2f}','fundamentalInvalidation':'核心单品批价创新低、渠道库存回升、经营现金流恶化或发生重大食品安全事件','nextReview':'2026年中报及中秋国庆渠道反馈后'},
'bearCase':['烟酒类零售包含烟草，13.2%的增长不能证明白酒真实动销反转','人口与饮酒频次长期变化可能使白酒行业只有集中度提升、没有总量增长','高端酒金融属性减弱后，批价和渠道利润可能长期低于历史中枢','酒企报表收入可能领先于真实开瓶，合同负债和现金流也需结合渠道库存核验'],
'evidenceQuality':[{'grade':'A','label':'宏观零售与公司财报','note':'国家统计局、交易所和公司披露'},{'grade':'B','label':'库存与动销','note':'中国酒业协会和毕马威全产业链调研'},{'grade':'A','label':'交易行情','note':'腾讯证券前复权日线，8股等权计算'},{'grade':'D','label':'波浪与缠论','note':'主观结构工具，只用于择时和失效定义'}],
'technical':{'instrument':'白酒A股8股等权篮子（茅台、五粮液、泸州老窖、汾酒、古井、今世缘、舍得、酒鬼酒）','timeframe':'日线 / 周线','trend':f'篮子{last:.2f}；MA5/10/20/60/90/120/145/250为'+ '/'.join(f'{mas[n]:.2f}' for n in [5,10,20,60,90,120,145,250])+f'。当前技术评级：{rating}。','volume':f'当日成交量{vol:.2f}万手，是5/10/20/60/90/145日均量的'+ '/'.join(f'{vol/vmas[n]:.2f}' for n in [5,10,20,60,90,145])+'倍。单日放量不足以确认趋势。','wave':f'主计数：长期下跌后的筑底/修复浪；备选：仍处于下降趋势中的中继反弹。突破{fib[0]:.2f}提高主计数可信度，跌破{low:.2f}失效。','fibonacci':f'以样本高低点{high:.2f}/{low:.2f}为锚，0.382/0.5/0.618反弹位为{fib[0]:.2f}/{fib[1]:.2f}/{fib[2]:.2f}。','chan':f'日线需形成离开下跌中枢的放量上笔，并在{fib[0]:.2f}上方回踩确认，才可视作三买候选；缺少30分钟数据，不精确宣称次级别买点。','rating':rating,'riskReward':'高端龙头优于等权篮子；板块整体仍需等待库存与趋势确认','trigger':f'20日均量1.2倍以上突破{fib[0]:.2f}并回踩不破，同时库存/批价改善','invalidation':f'跌破{low:.2f}，或库存和价盘继续恶化','volumeUnit':'8股成交量合计，万手','volumeAverages':[{'days':n,'average':vmas[n],'ratio':round(vol/vmas[n],2)} for n in [5,10,20,60,90,145]],'prices':prices,'volumes':volumes,'ohlc':ohlc},
'scenarios':[{'name':'乐观','weight':'25%','assumption':'去库存完成、价盘回稳、盈利上修','signal':f'突破{fib[1]:.2f}且现金流改善'},{'name':'基准','weight':'50%','assumption':'L型筑底、头部集中','signal':'龙头优于板块，批价低位稳定'},{'name':'悲观','weight':'25%','assumption':'需求和批价继续下行','signal':f'篮子跌破{low:.2f}'}],
'risks':['渠道库存和价格倒挂持续时间超预期','商务消费与居民消费能力恢复较慢','年轻人饮酒习惯和人口结构变化','酒企压货导致报表收入与真实动销背离','食品安全、税收和营销监管风险','等权篮子放大中小酒企影响，不代表市值加权白酒指数'],
'sources':['国家统计局：2026年上半年烟酒类零售额3547亿元，同比+13.2% https://www.stats.gov.cn/sj/zxfbhjd/202607/t20260715_1964127.html','中国酒业协会、毕马威：《2026中国白酒市场中期研究报告》 https://assets.kpmg.com/content/dam/kpmgsites/cn/pdf/zh/2026/06/2026-chinese-baijiu-market-mid-term-research-report.pdf.coredownload.inline.pdf','央广网转引中国酒业协会：《2025中国白酒市场中期研究报告》 https://food.cnr.cn/jyzx/20250619/t20250619_527220200.shtml','贵州茅台2025年年度报告（上交所） https://big5.sse.com.cn/site/cht/www.sse.com.cn/disclosure/listedinfo/announcement/c/new/2026-04-17/600519_20260417_9QS4.pdf','贵州茅台2026年第一季度报告 https://www.moutaichina.com/mtgf/articleFileDir/2026-04/27/caf6cef38da94e9e9e71949ad0064f77.pdf','国家统计局：2026H1居民收入与消费支出 https://www.stats.gov.cn/sj/zxfbhjd/202607/t20260715_1964129.html','行情：腾讯证券公开前复权日线；8股等权篮子，截至2026-08-10']
}
(ROOT/'data/reports/baijiu-sector.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('wrote',len(prices),'days; last',last,'MA',mas,'fib',fib,'rating',rating)
