// By + Copyright Greg Abbott V1 2020. V 2024-11-24
function chain(seed,...fs){return fs.reduce((a,f)=>f(a),seed)}
const pear_table = (() => {
const from_JAO_to={}
from_JAO_to.jao=x=>x//same
from_JAO_to.jaa=jao=>{
  //to:[keys[k1,k2],r1[v1,v2],r2[v1,v2]]
  return jao.reduce((a,ob)=>{
    a.push(Object.values(ob))
    return a
  },
  [Object.keys(jao[0])]
  )
}
function jaa_to_table({
  jaa,//data
  neck,// below header, above body
  transform,//any fn to process cell values
  wall,//string between internal columns
  //sides of each line:
    wall_left,
    wall_right,
}){

  let columns={}//stores length of longest value in column
  const rows = jaa.map(row=>row.map((cell,column_i)=>{
    let rv = {
      v:transform?transform(cell):v,
      typeWas:typeof cell,
      money:is_money_string(cell)
    }
    //Column Setup
    if(//column not setup yet
      !columns[column_i]){
      //set default
      columns[column_i]={width:0,align:'l'}
    }
    //Column Width
    if(
      //current cell width in columns exceeds all previous
      rv.v.length>columns[column_i].width
    ){columns[column_i].width = rv.v.length}//store new width
    //Column Alignment
    if(columns[column_i].align==='l'){
      //not yet determined if should align right
      if(rv.typeWas!=='string'||rv.money){//number-like
        columns[column_i].align='r'
      }
    }
    return rv
  }))
let pad = ' '
const formatted_rows = rows.reduce((a,row,row_i) =>{
  
 let newRow= wall_left+row.map((cell, col_index) => {
    const column_width = columns[col_index].width
      let pad_method=columns[col_index].align=='l'?'padEnd':'padStart'

      return cell.v[pad_method](column_width)
  }).join(pad+wall+pad) + wall_right
  a.push(newRow)
    if(//need to make divider row under header
      neck&&row_i==0
    ){
      let neck_row=[]
      for(let col in columns){
        neck_row.push(neck.repeat(columns[col].width))
      }
      a.push(wall_left+neck_row.join(pad+wall+pad) + wall_right)
    }
  return a
},[])
return formatted_rows
}
function is_money_string(s){
  //allow optional separator [`,`,`_`], in normal positions only
  //allow 0,1 or 2 decimals
  const regex = /^[£\$€]?(0|[1-9]\d{0,2}([_,]*\d{3})*)(\.\d{1,2})?$/
  return regex.test(s)
}
function escape_line_breaks(s){return s.replaceAll('\n','\\n')}
function escape_tabs(s){return s.replaceAll('\t','\\t')}
function wrap_in_quotes(s){return `"${s}"`}
from_JAO_to.jat=jao =>`\n[\n`+jaa_to_table({
    //J.A.T == JSON Array Table
    //Presents & aligns simple JSON data as table
    jaa:from_JAO_to.jaa(jao),
    transform:x=>{//Pseudo stringify (Wrap Strings in Quotes)
      return typeof x == 'string'
        ?chain(x,String,escape_line_breaks,escape_tabs,wrap_in_quotes)
        :String(x)+' '//align unquoted value with quoted header
    },
    wall:",",
    wall_left:'[ ',
    wall_right:` ]`,
  }).join(',\n')+`\n]\n`
from_JAO_to.mdt=jao =>jaa_to_table({
    jaa:from_JAO_to.jaa(jao),
     neck:'-',
    transform:x=>chain(x,String,escape_line_breaks,escape_tabs),
    wall:"|",
    wall_left:'| ',
    wall_right:` |`,
  }).join('\n')
from_JAO_to.ssv=jao =>jaa_to_table({
    jaa:from_JAO_to.jaa(jao),
    transform:x=>chain(x,String,escape_line_breaks,escape_tabs),
    wall:"",
    wall_left:'',
    wall_right:``,
  }).join('\n')
from_JAO_to.csv=(arr) => {
  if (!arr.length) return ''
  const escape_csv_value = (value) => {
    const str = String(value).replaceAll('\n','\\n')
    const has_quotes = str.includes('"')
    const has_commas = str.includes(',')
    const needs_escaping = has_quotes || has_commas
    const escaped_value = has_quotes ? str.replace(/"/g, '""') : str
    return needs_escaping ? `"${escaped_value}"` : escaped_value
  }
  const headers = Object.keys(arr[0])
  const rows = arr.map(obj => 
    headers.map(header=>escape_csv_value(obj[header])).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

from_JAO_to.tsv=jao=>{
  const h=Object.keys(jao[0]).join(`\t`)+'\n'
  const r=jao.reduce((a,o)=>a+
    Object.values(o)
    .map(x=>chain(x,String,escape_line_breaks,escape_tabs))
    .join(`\t`)+
    '\n'
  ,``)
  return (h+r).trim()
}
from_JAO_to.gsr=jao=>jao.reduce((a,o)=>{
  return a+= Object.entries(o).reduce((a,[k,v])=>{
    if(k.trim().length==0)return a
    return a+= `${k}: ${chain(v,String,escape_line_breaks)}\n`
  },'')+'\n'
},'')
from_JAO_to.md_gap=jao=>jao.reduce((a,o)=>{
  return a+= Object.entries(o).reduce((a,[k,v])=>{
    if(k.trim().length==0)return a
    return a+= `- ${k}: ${chain(v,String,escape_line_breaks)}\n`
  },'')+'\n'
},'')
from_JAO_to.mdl_nested=jao=>jao.reduce((a,o)=>
  a+=Object.entries(o).reduce((a,[k,v],i)=>a+
    `${i==0?'- \n':''}\t- ${k}: ${
      chain(v,String,escape_line_breaks)
    }\n`
  ,'')
,``)
.trim()
  from_JAO_to.html=jao=>{
  const h=`<thead>\n<tr>\n`+
    Object.keys(jao[0])
    .map(k=>`\t<th>${k}</th>`)
    .join(`\n`)+
    '\n</tr>\n</thead>\n'
  const r=jao.reduce(
    (a,o)=>a+'<tr>\n'+
      Object.values(o)
      .map(v=>
        `\t<td>`+
        v
        .toString()
        .replace(/\\n/g,'<br/>')
        +`</td>`
      )
    .join(`\n`)+
    '\n</tr>\n',
    ``)
  return `<table>\n${h}${r}</table>`
}
from_JAO_to.jsdb=a=>{//ga
  return a.reduce((acc,record,i)=>(
      acc.records.push(
        Object.entries(record)
        .reduce((new_rec,[k,v])=>(new_rec[acc.long_short[k]]=v,new_rec),{})
      ),
     i==acc.last_i&&['long_short','last_i','s'].forEach(p=>delete acc[p]),
    acc
    ),
  //seed
Object.keys(a[0]).reduce((a,k)=>{
    a.long_short[k]=a.s
    a.fields[a.s]=k
    a.s=increment_string(a.s)
    return a
  },{fields:{},records:[],long_short:{},s:`a`,last_i:a.length-1})                    
    )
  function increment_string(s){ //ga2020_0502
    return [...s.trim().toLowerCase()]
    .reverse()
    .reduce((a,c,i,s)=>{
      a.l.push(a.az[a.az.indexOf(c)+a.n]||`a`)
      a.n=a.n&&c==`z`
      if(i==s.length-1 && a.n){a.l.push(`a`)}
      return a
    },{l:[],az:[...`abcdefghijklmnopqrstuvwsyz`],n:1}).l
    .reverse()
    .join(``)
  }
}
const to_JAO_from={}
to_JAO_from.jaa=(jaa)=>{
  let [keys,...records]=JSON.parse(jaa)
  return records.map(record=>{
    return record.reduce((a,col,i)=>{
      a[keys[i]]=col
      return a
    },{})
  })
}
to_JAO_from.mdl_nested=z=>('\n'+z)
.split('\n- \n')//records
.reduce((a,record_lines)=>{
  if(record_lines.trim().length==0)return a
  a.push(('\n\t'+record_lines.trim())
    .split(/\n\s+- /)//pairs
    .reduce(
      (a,pair)=>{
        if(pair.trim().length==0)return a
        let [k,...v]= pair.split(': ')
        a[k.replaceAll('*','').trim()]=v.join(': ')
        return a
      },
      {}
    )
  )
  return a
},[])
to_JAO_from.jao=x=>typeof(x)==="string"?JSON.parse(x):x
to_JAO_from.dsv=delimiter=>x=>x
    .trim()
    .split('\n')
    .reduce((a,line)=>(line.trim().length>0&&a.push(
        line.trimEnd().split(delimiter)
      ),a)
    ,[])
  .reduce((a,row,row_i)=>{
    if(row_i==0){a.headers=row
      return a
    }
    a.rows.push(
      row.reduce((cols,col,col_i)=>{
        cols[a.headers[col_i].trim()]=col.trim()
        return cols
      },{})
    )
    return a
  },{rows:[],headers:[]}).rows
to_JAO_from.ssv=ssv_reader
function get_unused_key(base_key, used_keys/*Set*/) {
  let new_key = base_key
  if(used_keys.has(new_key)){
    let index = 1
    while(used_keys.has(new_key)){
      new_key = `${base_key}_${index}`
      index++
    }
  }
  used_keys.add(new_key)
  return new_key
}
function trim_leading_trailing_lines(text) {
  //trims lines that precede the first line with content,
  //trims lines that follow the last line with content
  //leaves alone: lines with content, and empty lines between
  //allows for leading trailing spaces on first last lines
  let lines = text.split('\n')
  let f = line => line.trim() !== ''
  let start = lines.findIndex(f)
  let end = lines.findLastIndex(f)
  return start<=end?lines.slice(start,end+1).join('\n'):''
}
function ssv_reader(ssv){ //2024_1121
  //space separated values grid to JS
  //Grid may have empty cells
  //handles missing header or cell value, 
  //handles columns with same names (by incrementing key '_1'…)
  //handles columns with varied alignment: left, right, center
  return parse_table_to_objects(
    trim_leading_trailing_lines(ssv)
  )
  function parse_table_to_objects(table) {
  let lines = table.split('\n').filter(line => line.trim() !== '')
  let boundaries = find_column_boundaries(table)
  let used_keys = new Set()
  let keys = boundaries.map(([A, Z]) =>  get_unused_key(
    lines[0].slice(A, Z + 1).trim(),
    used_keys
  ))
  return lines.slice(1).map(line => {
    return boundaries.reduce((o,[a,z],i)=>{
      o[keys[i]]=line.slice(a,z+1).trim()||null
      return o
    },{})
  })
}
function find_column_boundaries(table) {
  let lines = table.split('\n')
  let max_width = Math.max(...lines.map(line => line.length))
  lines = lines.map(line => line.padEnd(max_width, ' '))
  let is_in_column = Array(max_width).fill(false)
  lines.forEach(line => {
    line.split('').forEach((char, index) => {
      if (char !== ' ') is_in_column[index] = true
    })
  })
  let boundaries = []
  let in_column = false
  let start = null
  is_in_column.forEach((in_col, i) => {
    if (in_col && !in_column) {
      start = i
      in_column = true
    } else if (!in_col && in_column) {
      boundaries.push([start, i - 1])
      in_column = false
    }
  })
  if (in_column) boundaries.push([start, max_width - 1])
  return boundaries
}
 
}
to_JAO_from.csv=csv=> {
  const [header, ...lines] = csv.trim().split('\n')
  const parse_csv_line = (line) => line.match(/("([^"]|"")*"|[^,]+)(?=,|$)/g)
    .map(cell => cell.startsWith('"') ? cell.slice(1, -1).replace(/""/g, '"') : cell)
  const headers = parse_csv_line(header)
  return lines.map(line => {
    const cells = parse_csv_line(line)
    return headers.reduce((obj, key, i) => ({ ...obj, [key]: cells[i] }), {})
  })
}
to_JAO_from.tsv=tsv=>{
  const lines = tsv.trim().split('\n')
  const headers = lines[0].split('\t')
  return lines
  .slice(1)
  .map(line => {
    const values = line.split('\t')
    return headers.reduce((obj, header, i) => {
      obj[header] = 
        values[i] !== undefined ? values[i] : ''
      return obj
    }, {})
  })
}
to_JAO_from.mdt=x=>to_JAO_from.dsv('|')(//m.d.t MarkDown Table
  x
  .trim()
  .split('\n')
  .reduce((a,row,i)=>{
    if(i==1)return a//skip divider row
    a.push(row
      .replace(`|`,'')//remove first pipe
      .replace(/\| *$/,'')//remove last pipe
    )
    return a
  },[])
  .join('\n')
)
to_JAO_from.html=x=>{
  const parser = new DOMParser()
  const doc = parser.parseFromString(x, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr'))
    .map(row => Array.from(row.querySelectorAll('td, th'))
    .map(cell => cell.textContent.trim()))
  const keys = rows.shift() // First row becomes the keys
  return rows.map(row => row.reduce((obj, cell, i) => {
    obj[keys[i]] = cell
    return obj
  }, {}))
}
to_JAO_from.jsdb=x=>{
  //has {fields,records}
  x=typeof x ==="string"?JSON.parse(x):x
  if(typeof x==='string'){
    console.log('to_JAO_from.jsdb could not parse input to JSON')
    return x
  }
  return x.records.reduce((a,o)=>{
    a.push(
      Object.entries(o).reduce((a,[k,v])=>{
      a[x.fields[k]]=v
      return a
      },{})
    )
    return a
  },[])
}
to_JAO_from.md_gap=s=>gap_separated_records({is_list:true})(s)
to_JAO_from.gsr=s=>gap_separated_records({is_list:false})(s)
function ensure_all_objects_have_all_keys(rows){
  //[{a,b}{b,c,d}]->[{a,b,c,d}{a,b,c,d}]
  //get all keys
  let all_keys= rows.reduce(
      //case & space sensitive:' key '!=='key'!=='Key'
      (a,r)=>{for(let k in r){a.add(k)};return a},
      new Set()
  )
  //if(a row lacks key that another record has){add it}
  rows.forEach(r=>all_keys.forEach(k=>r[k]??=''))
  return rows
}
function gap_separated_records({is_list=false}={}){
  return data=>{
    return data
    .trim()
    .split(/\n\s*\n+/)
    .reduce((a,record,i)=>{
      let pairs=record.split('\n')
      let ob = pairs.reduce((obby,pair)=>{
        let separator = pair.indexOf(': ')
        let should_skip=separator==-1//lacks separator
        if(should_skip)return obby
        let k = pair.substring(0,separator).trim()
        if(is_list)k=k.replace(/^- /,'')//Replace List Bullet
        let v = pair.substring(separator+1).trim()
        obby[k]=v.trim()
        return obby
      },{})
      a.push(ob)
      return a
    },[])
  }}
  function transpose_jao(jao){//GA2024_0605
    //swap data so columns become rows and vice versa
    //when column 1 has field names & the rest hold 1 record each
    let keys = Object.keys(jao[0]),
    [first_field_name,...values_for_first_field]=keys,
    true_field_names = [
        first_field_name,
        ...jao.map(object=>object[first_field_name])
    ]
    return values_for_first_field.reduce((a,value_for_first_key,rec_i)=>(
       a.push(
          true_field_names.reduce((a2,key,keyi)=>{
            if(keyi===0){a2[key]=value_for_first_key}
            else{a2[key]=jao[keyi-1][keys[rec_i+1]]}
          return a2
          },{})
        ),a
    ),[])
  }
function clean_string(s){
  function make_spaces_normal(s){
    let non_breaking_space='\u00A0'
    let en_space='\u2002'
    let em_space='\u2003'
    let thin_space='\u2009'
    let zero_width_space=`\u200B`
    let zero_width_non_joiner=`\u200C`
    let zero_width_joiner=`\u200D`
    let space=' '
    let blank=''
    const replacements = {
      [non_breaking_space]: space,
      [en_space] : space,
      [em_space]: space, 
      [thin_space]: space,
      //NON spaces
      [zero_width_space]:blank,
      [zero_width_non_joiner]:blank,
      [zero_width_joiner]:blank
    }
    const pattern = new RegExp(
      `[${Object.keys(replacements).join('')}]`, 'g'
    )
    return s.replace(pattern, char => replacements[char] || '')
  }
  return make_spaces_normal(s)
}
function guess_format(s){
  s= clean_string(s)
  function attempt(fn,x){try{return fn(x)}catch(e){return x}}
  function is_array(x){return x?.constructor.name=='Array' }
  function is_string(x){return typeof x === 'string'}
  function try_parse_to_json_if_likely(s){
    let could_be_array=s.startsWith('[')&&s.endsWith(']')
    let could_be_object=s.startsWith('{')&&s.endsWith('}')
    let could_be_json=could_be_array||could_be_object
    return could_be_json?attempt(JSON.parse,s):s
  }
  //order of checks matters (allows less code)
  //after proving s!== type_X 
  //can do less checking complex to see if s == type_Y
  s= chain(
    s,
    trim_leading_trailing_lines,
    try_parse_to_json_if_likely
  )
  if(is_array(s))return is_array(s[0])?`jaa`:`jao` 
  if(/*{records:[]}*/is_array(s?.records))return `jsdb`
  if(/*is JSON but unknown shape*/!is_string(s))return false
  if(s.startsWith("<table>"))return `html`
  let first_line = s.substring(0,s.indexOf('\n'))
  if(first_line.includes('\t'))return `tsv`
  if(/\n\| *:*-+:* *\|/.test(s))return `mdt`
    //MDT allow [space between dashes, alignment ':' left right]
  if(first_line.includes('  '))return 'ssv'//col1  col2
  if(/^- +\n( +|\t)- /.test(s))return `mdl_nested`
  //checks that need to look at all lines with content:
  let rv = s
    .split('\n')//lines
    .filter(x=>x.trim().length>0)//with content only
    .reduce((a,x,i,l)=>{
      if(i==0){a.last_i =l.length-1 }
      let line_could_be_md_gap=
          x.startsWith('- ')&&x.includes(': ')
      let line_could_be_gsr=
          x.includes(': ')//<MAY have a key starting '- ' or not
      let line_could_be_csv=x.includes(',')
      //if previous lines didn't rule out possibility
      // allow current value check to rule it out
      if(a.could_be_csv&&!line_could_be_csv){
        a.could_be_csv=false
      }
      if(a.could_be_gsr&&!line_could_be_gsr){
        a.could_be_gsr=false
      }
      if(a.could_be_md_gap&&!line_could_be_md_gap){
        a.could_be_md_gap=false
      }
      if(i==a.last_i){
        let possibles =  Object.entries(a).filter(([k,v])=>{
          return v===true
        })
        //accept first TRUE key
        return possibles?.[0]
          ?.[0]
          .replace('could_be_','')
        ||false//NO MATCH
      }
      return a
    },
    {
      //order important
      could_be_csv:true,
      could_be_md_gap:true,//1 markdown list per record
      could_be_gsr:true,//gap separated record
    })
  return rv
}
function when(cond,fn){return data=>cond?fn(data):data}
function main({from,to='jao',transpose=false}){
  return data=>{
    //Allows converting to Identity: i.e TypeX to TypeX.
      //to present and clean data, in same format
      //Produces consistent: alignment, spacing, returns, quotes
      //e.g. Space Separated Tables, Markdown Tables
    return chain(
      data,
      clean_string,
      to_JAO_from[from],//[{a},{b}]
      when(transpose,transpose_jao),
      ensure_all_objects_have_all_keys,//[{a,b},{a,b}]
      from_JAO_to[to],
      convert_to_string_if_object
    )
  }
}
function convert_to_string_if_object(x){
  return typeof(x)==="object"
  ?JSON.stringify(x,null,2)
  :trim_leading_trailing_lines(x)
}
main.guess = guess_format
return main
})()