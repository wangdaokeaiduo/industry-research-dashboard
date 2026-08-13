import json, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
symbols={'sh600754':'锦江酒店','sh600258':'首旅酒店','sz300144':'宋城演艺','sh601888':'中国中免','sh600054':'黄山旅游','sz000888':'峨眉山A','sh603099':'长白山','sz300859':'西域旅游'}
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
short=last>mas[20] and last>mas[60]; long=last>mas[145]; tech='试仓' if short and long else ('观察' if short else '不适合左侧交易')
report={
'id':'tourism-hotel','industry':'旅游酒店','category':'mixed','asOf':'2026-08-10','updatedAt':'2026-08-11T19:20:00+08:00',
'decisionOverview':{'items':[{'label':'产业价值','value':'中高','score':74,'comment':'休闲需求、银发与入境游长期扩容'},{'label':'商业质量','value':'分化','score':66,'comment':'酒店加盟优于重资产，优质景区有稀缺性'},{'label':'估值吸引力','value':'中','score':62,'comment':'部分修复已定价，盈利持续性待验证'},{'label':'景气位置','value':'温和扩张','score':68,'comment':'人次增长快于花费，结构性复苏'},{'label':'综合评级','value':'观察','score':65,'comment':'酒店改善领先，板块尚未全面共振'}],'coreConflict':'旅游人次与入境客流增长明确，但人均花费承压、酒店供给扩张和免税/演艺利润恢复不一致，客流尚未充分转化为上市公司盈利。','action':'当前观察，不追逐假期客流主题；优先研究RevPAR转正、加盟占比高、现金流改善的酒店龙头，以及客流和客单价同步增长的稀缺景区。'},
'weeklyChanges':{'period':'首次建立','title':'首次建立旅游酒店决策基线','summary':'本期首次建立结构化基线。下周将比较出游人次、人均花费、酒店RevPAR、入境客流、公司盈利与技术触发状态。','items':[]},
'prosperity':{'level':'中高景气','direction':'温和扩张、利润分化','directionTone':'positive','score':68,'verdict':'2026Q1国内出游19.01亿人次、同比+6.0%，旅游花费1.86万亿元、同比+2.9%，显示需求扩张但人均花费下降。五一与端午延续“人次增速略高于花费”；入境外国人上半年同比+20.4%形成结构增量。酒店端首旅Q1 RevPAR同比+1.7%已转正，但演艺、免税和部分景区盈利仍分化，行业景气不能直接映射为板块普涨。','dimensions':[{'name':'国内客流','value':'较强','change':'Q1人次同比+6.0%','tone':'positive'},{'name':'人均消费','value':'偏弱','change':'花费增速低于人次','tone':'warning'},{'name':'酒店经营','value':'改善','change':'首旅RevPAR+1.7%','tone':'positive'},{'name':'入境游','value':'高增长','change':'外国人入境+20.4%','tone':'positive'}],'driver':'休闲化、亲子与银发、演唱会赛事、免签入境和高铁航空网络共同拉动客流；盈利取决于客单价、供给增速和经营杠杆。','improvement':'国内旅游花费增速连续两个季度高于人次，酒店RevPAR普遍转正，景区客单价与免税毛利率同步改善。','deterioration':'客流仍增但人均消费继续下降、酒店供给快于需求、极端天气或入境政策边际收紧。'},
'supplyDemand':{'state':'需求扩张、供给分化','tone':'warning','direction':'客流增长但人均消费偏弱','conclusion':'旅游客流与入境需求真实增长，但酒店房间、景区承载和旅行产品供给也在扩张；当前利润传导受人均花费、RevPAR和折扣约束，尚非全面紧缺。','demand':{'status':'扩张','evidence':'2026Q1国内出游19.01亿人次同比+6.0%，H1外国人入境同比+20.4%。','change':'休闲和入境需求增长','tone':'positive'},'supply':{'status':'酒店与目的地供给扩张','evidence':'加盟酒店和目的地项目持续增加，供给可能稀释RevPAR。','change':'供给同步增加','tone':'warning'},'inventory':{'status':'服务业无统一库存','evidence':'以可售房晚、景区承载、免税库存和预订提前期替代观察。','change':'细分差异大','tone':'neutral'},'price':{'status':'人均消费偏弱','evidence':'Q1旅游花费+2.9%低于人次+6.0%。','change':'价格/客单恢复落后','tone':'warning'},'profit':{'status':'酒店改善、免税演艺分化','evidence':'首旅Q1 RevPAR同比+1.7%，但免税毛利率和演艺盈利仍需验证。','change':'利润扩散不足','tone':'warning'},'leadingIndicator':'出游人次与花费、人均消费、核心酒店RevPAR、入境客流、免税毛利率和经营现金流。','improvement':'花费增速持续高于人次、核心酒店RevPAR连续两季为正且利润现金流扩散。','invalidation':'客流放缓、人均消费继续下降、酒店供给过快或免税折扣恶化。'},
'summary':{'stage':'需求扩张—盈利修复分化','rating':'观察；酒店龙头领先于板块','confidence':'中高','conclusion':f'旅游酒店具备中长期投资价值，但当前应做结构选择而非板块追涨。需求端真实增长，入境游更强；酒店加盟模式和稀缺景区的经营质量相对更好，但人均花费偏弱，宋城演艺2025收入同比-6.61%，中免毛利率承压，说明利润复苏并不普遍。8股等权篮子为{last:.2f}，MA20/60/145为{mas[20]:.2f}/{mas[60]:.2f}/{mas[145]:.2f}，技术评级“{tech}”。等待放量突破{fib[0]:.2f}并由中报盈利确认后再考虑试仓。','evidence':['2026Q1国内出游19.01亿人次同比+6.0%，花费1.86万亿元同比+2.9%','2026H1外国人入境2291万人次同比+20.4%，免签入境同比+30.6%','首旅酒店2026Q1 RevPAR 143元同比+1.7%，酒店经营出现局部反转']},
'cycle':{'current':'需求扩张—盈利修复分化','stages':['疫情出清','需求快速恢复','供给扩张','价格与利润承压','需求扩张—盈利修复分化','RevPAR与客单共振','景气扩张']},
'reversalConditions':[
 {'name':'国内旅游需求持续增长','dimension':'需求','current':'2026Q1人次+6.0%，五一+3.6%，端午+4.4%','threshold':'连续两个季度/假期人次保持正增长','status':'met','trend':'up','source':'文化和旅游部，2026Q1及假期数据'},
 {'name':'人均旅游消费改善','dimension':'价格','current':'Q1花费+2.9%低于人次+6.0%','threshold':'花费增速连续两个季度高于人次增速','status':'unmet','trend':'down','source':'文化和旅游部，2026Q1'},
 {'name':'酒店RevPAR普遍转正','dimension':'酒店盈利','current':'首旅Q1 RevPAR+1.7%，行业公司仍分化','threshold':'核心酒店集团连续两季RevPAR正增长','status':'partial','trend':'up','source':'首旅、锦江2026Q1报告'},
 {'name':'入境游高增长','dimension':'结构需求','current':'H1外国人入境2291万人次，同比+20.4%','threshold':'外国人入境维持双位数增长','status':'met','trend':'up','source':'国家移民管理局，2026H1'},
 {'name':'上市公司利润扩散','dimension':'盈利','current':'酒店改善，演艺、免税与景区表现分化','threshold':'多数样本利润和经营现金流同步增长','status':'partial','trend':'flat','source':'2025年报与2026Q1财报'},
 {'name':'技术趋势确认','dimension':'市场定价','current':f'篮子{last:.2f}，MA20/60/145={mas[20]:.2f}/{mas[60]:.2f}/{mas[145]:.2f}','threshold':f'放量突破{fib[0]:.2f}并回踩不破','status':'met' if short and long else ('partial' if short else 'unmet'),'trend':'up' if short else 'flat','source':'腾讯证券前复权行情，截至2026-08-10'}],
'metrics':[{'label':'Q1国内出游','value':'19.01','unit':'亿人次','change':'同比 +6.0%','direction':'up','series':[14.19,17.94,19.01]},{'label':'Q1旅游花费','value':'1.86','unit':'万亿元','change':'同比 +2.9%','direction':'up','series':[1.52,1.81,1.86]},{'label':'五一国内出游','value':'3.25','unit':'亿人次','change':'同比 +3.6%','direction':'up','series':[2.95,3.14,3.25]},{'label':'外国人入境','value':'2,291','unit':'万人次/H1','change':'同比 +20.4%','direction':'up','series':[1463,1903,2291]},{'label':'首旅RevPAR','value':'143','unit':'元/Q1','change':'同比 +1.7%','direction':'up','series':[137,141,143]},{'label':'篮子收盘','value':f'{last:.2f}','unit':'点','change':'截至8月10日','direction':'up' if prices[-1]>prices[-20] else 'down','series':prices[-20:]}],
'industryChain':[{'stage':'上游','title':'交通、物业、目的地资源与内容IP','items':['航空铁路和道路决定可达性，物业租金影响酒店成本','自然与文化资源稀缺，但受天气、承载量和监管约束','演艺IP、赛事和会展可提高停留时长与二次消费']},{'stage':'中游','title':'酒店、景区、旅行服务与免税','items':['酒店加盟管理的资本效率通常优于重资产直营','景区利润取决于客流、客单、索道交通与二消','OTA和旅行社掌握流量，免税依赖政策、客流和折扣纪律']},{'stage':'下游','title':'休闲、商务、入境与银发客群','items':['大众休闲贡献人次，商务出行影响高端酒店房价','亲子、银发、演唱会赛事和冰雪游提供结构增长','入境游客消费能力较强，但支付、语言和产品供给仍需完善']}],
'companyComparison':[
 {'tier':'核心观察','tone':'positive','company':'首旅酒店','ticker':'600258.SH','driver':'RevPAR转正、加盟扩张与效率改善','valuation':'用EBITDA/FCF与加盟收入增长交叉验证','risk':'酒店供给扩张、房价承压'},
 {'tier':'反转观察','tone':'warning','company':'锦江酒店','ticker':'600754.SH','driver':'境内RevPAR、海外整合与债务优化','valuation':'分部EV/EBITDA并关注净负债','risk':'海外经营、整合和供给竞争'},
 {'tier':'优质景区','tone':'positive','company':'黄山旅游/峨眉山A','ticker':'600054.SH / 000888.SZ','driver':'资源稀缺、索道与客流恢复','valuation':'正常化客流下的FCF和股息能力','risk':'天气、门票政策和客单价'},
 {'tier':'成长弹性','tone':'warning','company':'长白山/西域旅游','ticker':'603099.SH / 300859.SZ','driver':'冰雪、区域客流和项目扩容','valuation':'高弹性需匹配客流、产能与利润兑现','risk':'季节性、估值波动和承载力'},
 {'tier':'修复观察','tone':'warning','company':'宋城演艺','ticker':'300144.SZ','driver':'演艺项目、轻资产输出和内容迭代','valuation':'单项目现金流与成熟项目利润率','risk':'2025利润下滑、项目投入和客单价'},
 {'tier':'修复观察','tone':'negative','company':'中国中免','ticker':'601888.SH','driver':'入境出境客流、海南政策和市内免税','valuation':'关注毛利率、库存和经营现金流，不只看收入','risk':'折扣竞争、毛利率与渠道分流'}],
'valuationScenarios':[{'name':'乐观','weight':'30%','assumption':'人均花费转正、酒店RevPAR持续增长、入境高增','valuation':'酒店用EV/EBITDA，景区/演艺用FCF，免税看利润率修复','signal':'中报利润和现金流普遍上修'},{'name':'基准','weight':'50%','assumption':'客流温和增长，客单偏弱，细分继续分化','valuation':'以正常化利润估值，不把单个假期客流年化','signal':'酒店领先、景区分化、免税缓慢修复'},{'name':'悲观','weight':'20%','assumption':'人均消费下降、供给过快、天气事件扰动','valuation':'盈利下修，重资产与高估值标的折价','signal':'RevPAR转负且中报现金流恶化'}],
'catalysts':[{'date':'2026-08至09','event':'暑期数据与上市公司中报','expectation':'RevPAR、客单价和利润改善','status':'pending','statusLabel':'关键验证'},{'date':'2026-10','event':'国庆中秋旺季','expectation':'花费增速追上人次','status':'pending','statusLabel':'核心节点'},{'date':'持续','event':'免签扩围与国际航班恢复','expectation':'入境游客和高客单消费增长','status':'pending','statusLabel':'结构催化'}],
'executionPlan':{'action':'观察；酒店龙头和稀缺景区优先','trigger':f'20日均量1.2倍以上突破{fib[0]:.2f}，且中报验证RevPAR/客单价与利润改善','add':f'突破后回踩MA60 {mas[60]:.2f}不破，行业花费增速向人次增速靠拢','priceInvalidation':f'篮子跌破{low:.2f}','fundamentalInvalidation':'酒店RevPAR重新转负、旅游花费明显弱于人次，或核心公司现金流恶化','nextReview':'2026年中报和暑期经营数据披露后'},
'bearCase':['旅游人次增长可能来自短途和低价出行，无法支持人均消费与利润率','酒店加盟扩张增加房间供给，RevPAR修复可能被供给稀释','入境人数高增长基数较低，且未必直接流向A股景区酒店公司','极端天气、公共安全和宏观消费信心会造成明显季度波动'],
'evidenceQuality':[{'grade':'A','label':'旅游、消费与出入境数据','note':'文旅部、国家统计局、国家移民管理局'},{'grade':'A','label':'公司经营与财务','note':'交易所和公司定期报告'},{'grade':'A','label':'行情','note':'腾讯证券前复权日线，8股等权计算'},{'grade':'D','label':'波浪与缠论','note':'主观结构工具，仅辅助择时'}],
'technical':{'instrument':'旅游酒店A股8股等权篮子','timeframe':'日线 / 周线','trend':f'篮子{last:.2f}；MA5/10/20/60/90/120/145/250为'+'/'.join(f'{mas[n]:.2f}' for n in [5,10,20,60,90,120,145,250])+f'。技术评级：{tech}。','volume':f'当日成交量{vol:.2f}万手，是5/10/20/60/90/145日均量的'+'/'.join(f'{vol/vmas[n]:.2f}' for n in [5,10,20,60,90,145])+'倍。','wave':f'主计数为调整后的修复浪；备选为区间震荡中的反弹。突破{fib[0]:.2f}提高反转可信度，跌破{low:.2f}失效。','fibonacci':f'以样本高低点{high:.2f}/{low:.2f}为锚，0.382/0.5/0.618反弹位为{fib[0]:.2f}/{fib[1]:.2f}/{fib[2]:.2f}。','chan':f'日线需放量离开中枢并在{fib[0]:.2f}上方回踩确认，才构成三买候选；无30分钟数据，不精确确认次级别买点。','rating':tech,'riskReward':'当前一般，等待盈利和价格双确认','trigger':f'放量突破{fib[0]:.2f}并回踩不破，同时中报盈利改善','invalidation':f'跌破{low:.2f}，或RevPAR与现金流重新恶化','volumeUnit':'8股成交量合计，万手','volumeAverages':[{'days':n,'average':vmas[n],'ratio':round(vol/vmas[n],2)} for n in [5,10,20,60,90,145]],'prices':prices,'volumes':volumes,'ohlc':ohlc},
'scenarios':[{'name':'乐观','weight':'30%','assumption':'客流、客单和利润共振','signal':f'突破{fib[1]:.2f}且盈利上修'},{'name':'基准','weight':'50%','assumption':'需求温和扩张、细分分化','signal':'酒店和稀缺景区相对占优'},{'name':'悲观','weight':'20%','assumption':'低价出游与供给压力延续','signal':f'跌破{low:.2f}'}],
'risks':['人次增长但人均花费下降','酒店房间供给增速快于需求','极端天气与公共安全事件','免税折扣竞争和毛利率压力','景区门票政策与承载量约束','等权篮子混合酒店、景区、免税和演艺，不能代表任一细分指数'],
'sources':['文化和旅游部：2026年一季度国内居民出游数据 https://zwgk.mct.gov.cn/zfxxgkml/tjxx/202604/t20260429_965662.html','文化和旅游部：2026年五一假期国内出游3.25亿人次 https://www.mct.gov.cn/whzx/whyw/202605/t20260506_965708.htm','文化和旅游部：2026年端午国内出游1.24亿人次 https://www.mct.gov.cn/wlbphone/wlbydd/xxfb/jiaodianxinwen/202606/t20260622_966305.html','国家移民管理局：2026H1外国人入境与免签数据 https://en.nia.gov.cn/n147413/c200568/content.html','国家统计局：2026H1住宿和餐饮业增加值同比+5.0% https://www.stats.gov.cn/sj/zxfb/202607/t20260716_1964142.html','首旅酒店2026年第一季度报告 https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12245045&stockid=600258','宋城演艺2025年年度报告 https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-24/e7a27e5e-b38f-41c9-89d6-71bc434c9698.PDF','中国中免2025年年度报告 https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12047992','行情：腾讯证券前复权日线；8股等权篮子，截至2026-08-10']}
(ROOT/'data/reports/tourism-hotel.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('wrote',len(prices),'days; last',last,'MA',mas,'fib',fib,'rating',tech)
