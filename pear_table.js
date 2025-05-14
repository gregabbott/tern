// By + Copyright Greg Abbott V1 2020. V 2025_0222
const pear_table = (() => {
  const VALUE_TO_USE_FOR_BLANK = ''
  const ALL_DIGITS_TOKEN = '█'
  const SSV_DELIMITER='  '
  function chain(seed,...fs){return fs.reduce((a,f)=>f(a),seed)}
  function log(x){console.log(x);return x}
  function convert_to_string_if_object(x){
    return typeof(x)==="object"
    ?JSON.stringify(x,null,2)
    :trim_leading_trailing_lines(x)
  }
  function trim_leading_trailing_lines(text) {
    //find first line with visible content, remove lines before
    //find last line with visible content, remove lines after
    //keeps any leading & trailing spaces on first & last lines
    //keeps any empty lines between lines of visible content
    let lines = text.split('\n')
    let f = line => line.trim() !== ''
    let start = lines.findIndex(f)
    let end = lines.findLastIndex(f)
    return start<=end?lines.slice(start,end+1).join('\n'):''
  }
  function ensure_all_objects_have_all_keys(rows){
    //[{a,b}{b,c,d}]->[{a,b,c,d}{a,b,c,d}]
    let all_keys= rows.reduce(
        //case sensitive & space sensitive:
          //' key '!=='key'!=='Key'
        (a,r)=>{for(let k in r){a.add(k)};return a},
        new Set()
    )
    //if(a row lacks key that another record has){add it}
    rows.forEach(r=>all_keys.forEach(k=>r[k]??=''))
    return {rows,all_keys:[...all_keys]}
  }
  function clean_string(s){
    //make spaces normal
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
  function is_money_string(s){
    //allow optional separator [`,`,`_`], in normal positions only
    //allow 0, 1 or 2 decimals
    const regex = /^[£\$€]?(0|[1-9]\d{0,2}([_,]*\d{3})*)(\.\d{1,2})?$/
    return regex.test(s)
  }
  function escape_line_breaks(s){return s.replaceAll('\n','\\n')}
  function escape_tabs(s){return s.replaceAll('\t','\\t')}
  function wrap_in_quotes(s){return `"${s}"`}
const from_jaa_to={}//JAA[[k1,k2],[r1k1v,r1k2v],…]
from_jaa_to.jao=(jaa)=>{
//if(typeof jaa=='string'){jaa=JSON.parse(jaa)}
let [keys,...records]=jaa
return records.map(record=>{
  return record.reduce((a,col,i)=>{
    a[keys[i]]=col
    return a
  },{})
})
}
from_jaa_to.jao_aligned=table=>{//2025_0222
  if (!table.length) return '[]'
  const [keys, ...records] = table
  if (!keys.length) return '[]'
  const max_lengths = keys.map((key, i) => key.length)
  const formatted = records.map(row => {
    return keys.map((key, i) => {
      const value = row[i]
      const formatted_value = typeof value === 'string' ? `"${value}"` : value
      max_lengths[i] = Math.max(max_lengths[i], (formatted_value + '').length)
      return {
        key:wrap_in_quotes(key),//<-- Quote key
       value:formatted_value,
       index: i
      }
    })
  })
  return `[\n${formatted.map(record => {
    return '{' + record.map(({ key, value, index }) => {
      const padding = ' '.repeat(max_lengths[index] - (value + '').length)
      return typeof value === 'string'
        ? `${key}:${value}${padding}`
        : `${key}:${padding}${value}`
    }).join(', ') + '}'
  }).join(',\n')}\n]`
}
from_jaa_to.jaa=x=>x
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
      v:transform?transform(cell):cell,
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
 let new_row= wall_left+row.map((cell, col_index) => {
    const column_width = columns[col_index].width
      let pad_method=columns[col_index].align=='l'?'padEnd':'padStart'
      return cell.v[pad_method](column_width)
  }).join(pad+wall+pad) + wall_right
  a.push(new_row)
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
let process_for_cell={}
process_for_cell.md=x=>chain(
  x,
  String,
  escape_line_breaks,
  escape_tabs
)
process_for_cell.ssv=x=>{
  function escape_ssv_delimiter(s){
  //if cell value includes SSV delimiter, swap it
    return s.replaceAll(SSV_DELIMITER,"▯")
  }
  return chain(
    x,
    String,
    escape_line_breaks,
    escape_ssv_delimiter,
    escape_tabs
  )
}
from_jaa_to.jaa_aligned=jaa =>`\n[\n`+jaa_to_table({
    //J.A.T == JSON Array Table
    //Presents & aligns simple JSON data as table
    jaa,
    transform:x=>{//Pseudo stringify (Wrap Strings in Quotes)
      return typeof x == 'string'
        ?chain(x,String,escape_line_breaks,escape_tabs,wrap_in_quotes)
        :String(x)+' '//align unquoted value with quoted header
    },
    wall:",",
    wall_left:'[ ',
    wall_right:` ]`,
  }).join(',\n')+`\n]\n`
  from_jaa_to.mdt_aligned=jaa =>jaa_to_table({
    jaa,
     neck:'-',
    transform:process_for_cell.md,
    wall:"|",
    wall_left:'| ',
    wall_right:` |`,
  }).join('\n')
from_jaa_to.mdt=jaa =>jaa.reduce(
  (lines,line,i)=>{
    lines.push(`|`+line.map(process_for_cell.md).join('|')+`|`)
    if(i===0)lines.push("|-".repeat(line.length)+`|`)
    return lines
  },[])
  .join('\n')
from_jaa_to.ssv_aligned=jaa=>jaa_to_table({
    jaa,
    transform:process_for_cell.ssv,
    wall:"",
    wall_left:'',
    wall_right:``,
  }).join('\n')
from_jaa_to.ssv=lines=>lines
  .map(line=>line.map(process_for_cell.ssv).join(SSV_DELIMITER))
  .join('\n')
from_jaa_to.csv=(x) => {
  if (x.length===0) return ''
  const escape_csv_value = value => {
    const str = String(value).replaceAll('\n','\\n')
    const has_quotes = str.includes('"')
    const has_commas = str.includes(',')
    const needs_escaping = has_quotes || has_commas
    const escaped_value = has_quotes ? str.replace(/"/g, '""') : str
    return needs_escaping ? `"${escaped_value}"` : escaped_value
  }
  return x.map(line=>line.map(escape_csv_value).join(',')).join('\n')
}
from_jaa_to.tsv=x=>x.map(x=>x.map(String).join('\t')).join('\n')
from_jaa_to.gsr=jaa_to_gap_style({})
function jaa_to_gap_style({list=false,nest=false}){return x=>{
  return x
  .reduce((acc,record,record_index)=>{
    if(record_index===0){
      acc.keys = record//first record == keys
      return acc
    }
    acc.records.push(
      (nest?"-\n\t":"")+
      //record with keys
      acc.keys.reduce((lines,k,key_index)=>{
        lines.push(
          `${list?'- ':''}${k}: ${chain(record[key_index],String,escape_line_breaks)}`
        )
        return lines
      },
      [])
      .join(nest?'\n\t':'\n')
    )
    return acc
  },
  {records:[]}
  )
  .records
  .join(nest?'\n':'\n\n')
}}
from_jaa_to.md_gap=jaa_to_gap_style({list:true})
from_jaa_to.mdl_nested=jaa_to_gap_style({list:true,nest:true})
from_jaa_to.html=x=>{
  function line(tag){return row=>
    `<tr>\n`+row.map(c=>
      `\t<${tag}>${String(c).replace(/\\n/g,'<br/>')}</${tag}>`
    ).join(`\n`)+'\n</tr>'
  }
  return `<table>\n`+
    x.reduce((ac,row,i)=>{
      if(i===0){
      ac.push(`<thead>\n`+line('th')(row)+'\n</thead>\n<tbody>')
      }
      else ac.push(line('td')(row))
    return ac
  },[]).join('\n')
  + `\n</tbody>\n</table>`
}
from_jaa_to.html_aligned=data=>{// 2025_0222
  const col_metadata = data[0].map((_, i) => ({
      width:Math.max(...data.map(row => String(row[i]).length)),
      //log when every cell in column (bar header) is numeric
      is_numeric:data.slice(1).every(row => typeof row[i] === 'number')
    })
  )
  const format_cell = (value, index, is_header) => {
    const str_value = String(value)
    return col_metadata[index].is_numeric && 
      (!is_header || data.slice(1).length > 0)
      ? str_value.padStart(col_metadata[index].width)
      : str_value.padEnd(col_metadata[index].width)
  }
  let html5=true
  if(html5){
    //skip closing th td th tags: valid (if not advisable)
    const format_row = (row, tag, is_header = false) =>
      `<tr>${
        row
        .map((v,i)=>`<${tag}>${format_cell(v, i, is_header)}`)
        .join('')
      }`
    return `<table>\n`+
  format_row(data[0], 'th', true)+'\n'+
  data.slice(1).map(row => format_row(row, 'td')).join('\n')+
  `\n</table>`
  }
  else{
    const format_row = (row, tag, is_header = false) =>
      `<tr>${row.map((v, i) => `<${tag}>${format_cell(v, i, is_header)}</${tag}>`).join('')}</tr>`
    return `<table>
  <thead>
  ${format_row(data[0], 'th', true)}
  </thead>
  <tbody>
  ${data.slice(1).map(row => format_row(row, 'td')).join('\n')}
  </tbody>
  </table>`
  }
}
from_jaa_to.jsdb=a=>{//ga
  return a.reduce((acc,record,i)=>{
    if(i===0)return acc
      acc.records.push(
        record
        .reduce((new_rec,v,i)=>{
          new_rec[acc.long_short[i]]=v
          return new_rec
        },{})
      )
    if(i==acc.last_i){
      ['long_short','last_i','s'].forEach(p=>delete acc[p])
    }
    return acc
  },
  //seed
  a[0].reduce((a,k,i)=>{
    a.long_short[i]=a.s
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
const to_jaa_from={}//e.g. output [[k1,k2],[r1k1v,r1k2v],[etc]]
to_jaa_from.html=(x)=>{
  return [...new DOMParser().parseFromString(x, 'text/html').querySelectorAll('tr')]
    .map(row => 
      [...row.querySelectorAll('td, th')]
      .map(cell => cell.textContent.trim())
    )
}
to_jaa_from.html_aligned=to_jaa_from.html
to_jaa_from.csv=x=> {
  return x
  .split('\n')
  .map((line) => line
    .match(/("([^"]|"")*"|[^,]+)(?=,|$)/g)
    .map(cell => cell.startsWith('"')
      ? cell.slice(1, -1).replace(/""/g, '"')
      : cell
    )
  )
}
to_jaa_from.tsv=x=>x
  .split('\n')
  .map(line=>line.split('\t'))
to_jaa_from.mdt=x=>x
.split('\n')
.reduce((a,row,i)=>{
if(i===1)return a//skip divider row |---|
a.push(row
    .trim()
    .replace(/^\|/g,'')//remove first pipe
    .replace(/\| *$/,'')//remove last pipe
    .split("|")
    .map(x=>x.trim())//trim cell
)
return a
  },[])
//to JAA from space table!
to_jaa_from.ssv_basic=ssv=>{
  //each cell per line separated by 2 or more spaces
  //but data not necessarily aligned visually
  //Also, disallows (doesn't figure out) empty cells 
  //console.log({ssv})
  return ssv.split('\n').map(x=>x.split(/ {2,}/))
}
to_jaa_from.ssv=ssv=>{
  //ssv basic and ssv aligned both parse slightly differently
  //col1  col2
  function is_basic_ssv(ssv_data) {//2025_0222
    //i.e. cells per column Not aligned left,center,right
    //checking each cell per row delimited with same string
      // (fixed number of spaces, over 2)
    //get delimiter 
      //(first string equal to 2+ spaces, from 1st content line)
    //check each line uses exactly that delimiter
    //or a multiple of it (to account for a blank cell on a row)
    let rows = ssv_data.trim().split(/\n+/).map(r => r.trimEnd());
    let first_row = rows.find(r => / {2,}/.test(r));
    if (!first_row) return false;
    let match = first_row.match(/ {2,}/);
    if (!match) return false;
    let delimiter_length = match[0].length;
    return rows.every(row => {
      let parts = row.split(/ {2,}/);
      let expected_gaps = row.match(/ {2,}/g) || [];
      return expected_gaps.every(gap => gap.length % delimiter_length === 0);
    });
  }

  return to_jaa_from[is_basic_ssv(ssv)?'ssv_basic':'ssv_aligned'](ssv)
}
to_jaa_from.ssv_aligned=ssv=>{
  //this one expected the input to be neatly aligned
  //and will handle empty cells encountered
  //for this type all data per column starts AFTER widest item of the previous column
  //e.g. (here all col2 items start after widest col1 ends)
    //Date        Name
    //01/01/2025  blue
    //02/01/2025  green
    //03          yellow
  //not this 
    //(basic ssv [N or more gaps = delimiter: no blank cells])
    //(some col2 items start before widest col1 item ends)
    //Date   Name
    //01/01/2025   blue
    //02/01/2025   green
    //03   yellow
  //S.S.V == Space Separated Values: from ASCII style grid to JS
  //handles missing header or cell value, 
  //handles columns with same names (by incrementing key '_1'…)
  //handles columns with varied alignment: left, right, center
    let boundaries = find_column_boundaries(ssv)
    return ssv
      .split('\n')//lines
      .reduce((lines,line) => {
        //skip blank lines
        if(line.trim().length===0){return lines}
        lines.push(
          boundaries.reduce((o,[a,z],i)=>{
            o.push(line.slice(a,z+1).trim()||'')
            return o
          },[])
        )
        return lines
      },[])
      function find_column_boundaries(table, min_gap = SSV_DELIMITER.length) {
        //at least N spaces between columns
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
        return boundaries.filter((b, i, arr) => 
          i === 0 || b[0] - arr[i - 1][1] > min_gap
        )
      }
}
//to jaa from gap separated records
to_jaa_from.gsr=s=>from_gap_separated_records_to_jaa({is_list:false})(s)
function from_gap_separated_records_to_jaa({is_list=false}={}){
  return data=>{
    let all_keys = new Set()
    let jao = data
    .trim()
    .split(/\n\s*\n+/)
    .reduce((a,record,i)=>{
      let pairs=record.split('\n')//[[key,val]…]
      let ob = pairs.reduce((obby,pair)=>{
        let separator = pair.indexOf(': ')
        let should_skip=separator==-1//lacks separator
        if(should_skip)return obby
        let k = pair.substring(0,separator).trim()
        if(is_list)k=k.replace(/^- /,'')//Replace Bullet
        all_keys.add(k)//collect corrected key
        let v = pair.substring(separator+1).trim()
        obby[k]=v.trim()
        return obby
      },{})
      a.push(ob)
      return a
    },[])
    //below ensures all records share same properties and order
    //As input may have:
      // some objects with different props
      // or same props in different orders
    return [
      [...all_keys],//all collected keys in order collected
      ...jao.reduce((records,record)=>{
          let new_ob = []
          all_keys.forEach(key=>{
            new_ob.push(record[key]||"")
          })
          records.push(new_ob)
        return records
      },[])
    ]
  }
}
//to jaa from markdown lists
to_jaa_from.md_gap=s=>from_gap_separated_records_to_jaa({is_list:true})(s)
//to jaa from markdown list nested
to_jaa_from.mdl_nested=s=>{
  return from_gap_separated_records_to_jaa({is_list:false})(
  s
  //convert to gap separated
  .replace(/- *\n/g,'\n')//note allow 0+ spaces after bullet
  .replace(/\n[ |\t]+- /g,'\n')
  )
}
to_jaa_from.jaa=x=>{
  if(typeof x=='string')return JSON.parse(x)
  return x//[[k1,k2],[r1k1v,r1k2v],…] i.e. [keys ...records]
}
//"JSON array table" presents an aligned JSON array of arrays
to_jaa_from.jaa_aligned=to_jaa_from.jaa
to_jaa_from.jao=data=>{//J.A.O == JSON array of objects
  //items may not have same keys
if(typeof data ==='string')data=JSON.parse(data)
  let {all_keys,rows} = ensure_all_objects_have_all_keys(data)
  return rows
  .reduce((a,ob)=>{
    //Extract the object's values in a unified order to an array
    a.push(all_keys.map(k=>ob[k]))
    return a
  },
  [all_keys]
  )
}
to_jaa_from.jao_aligned=to_jaa_from.jao
to_jaa_from.jsdb=x=>{
  //items may not have same properties or same order
  //in jsdb, fields property sets expected (keys) and order
  //if(any record has properties not listed in "fields"){chuck}
  let {fields:fields_o,records} = JSON.parse(x)
  //If(error){x either lacks fields OR records prop}
  let fields = Object.values(fields_o)
  let short_names = Object.keys(fields_o)
  //console.log({fields,short_names})
  return [
    fields,
    ...records.map(rec=>{
      //return record with data in order of fields
      //use blank value if missing
      return short_names.map(field=>{
        return rec[field]||VALUE_TO_USE_FOR_BLANK
      })
    })
  ]
}
//==============================================================
function guess_format(s){
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
    clean_string,
    trim_leading_trailing_lines,
    try_parse_to_json_if_likely
  )
  if(is_array(s))return is_array(s[0])?`jaa`:`jao` 
  if(/*{records:[]}*/is_array(s?.records))return `jsdb`
  if(/*is JSON but unknown shape*/!is_string(s))return false
  if(s.startsWith("<table>"))return `html`
  let first_line = s.substring(0,s.indexOf('\n'))
  if(first_line.includes('\t'))return `tsv`
  if(/\n\| *:*-+:* *\|/.test(s)){
    return `mdt`
    //MDT allow [space between dashes, alignment ':' left right]
  }
  if(/^- *\n( +|\t)- /.test(s)){
    //note: allows 0+ spaces after top level bullet
    return `mdl_nested`
  }
  if(first_line.includes(SSV_DELIMITER)){
    return 'ssv'
  }
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
function give_each_jaa_item_same_number_of_items(l){
  let each_needs_n_items=l.reduce(
    (a,row)=>Math.max(a,row.length),0
  )
  return l.map(row=>{
     while (row.length < each_needs_n_items) {
        row.push(VALUE_TO_USE_FOR_BLANK);
    }
    return  row
  })
}
function transpose_jaa(l){
  return l[0].map((_, colIndex) => l.map(row => row[colIndex]))
}
function fix_jaa_headers(jaa){
  function make_values_in_list_unique(list){
    let headers_encountered= new Set()
    return list.map(header=>{
      let i = 1
      let is_all_digits = /^\d+$/.test(header)
      if(is_all_digits){
        // suffix it
        // to stop JS moving the property when making JS objects
        // e.g. (a,b,3,c) would otherwise change to (3,a,b,c)
        header = header+ALL_DIGITS_TOKEN
      }
      // if a record has properties with same name
      // e.g. multiple input columns share the same header text
      // append the instance number to all secondary instances
      // e.g. {name:"","name(2)":""}
      // to prevent over-riding data in output
      let available = header
      let pad = header.endsWith(' ')?'':' '
      //no need to pad further
      while(headers_encountered.has(available)){
        i++
        available = header + pad+`(${i})`
      }
      headers_encountered.add(available)//store as taken
      return available
    })
  }
  jaa[0]= make_values_in_list_unique(jaa[0])
  return jaa
}
function reverse_jaa_key_order(jaa){
  return jaa.map(line=>line.reverse())
}
/*
function reverse_jaa_record_order([first,...rest]){//O(n)
  return [first,...rest.reverse()]
}*/
function reverse_jaa_record_order(arr) {//O(1) Mutates
  if (arr.length <= 1) return arr
  let left = 1 // Second element
  let right = arr.length - 1 // Last element
  while (left < right) {// Swap the elements
      [arr[left], arr[right]] = [arr[right], arr[left]]
      left++
      right--
  }
  return arr // Return the modified array
}
function when(cond,fn){return data=>cond?fn(data):data}
function main({
  from,
  to='jao',
  transpose=false,
  reverse_key_order=false,
  reverse_record_order=false,
  align_if_possible=false,
}){
  return data=>{
    //Allows converting to Identity: i.e TypeX to TypeX.
      //to present and clean data, keeping the same format
      //Produces consistent: alignment, spacing, returns, quotes
      //e.g. Space Separated Tables, Markdown Tables
    return chain(
      data,
      clean_string,
      trim_leading_trailing_lines,
      to_jaa_from[from],
      give_each_jaa_item_same_number_of_items,//fill blanks
      //^ [[1,2],[1,2,3],[1]]->[[1,2,3],[1,2,3],[1,2,3]]
      when(transpose,transpose_jaa),
      //now that row 0 == wanted keys:
      fix_jaa_headers,//make each key unique keys, and no digit only keys
      when(reverse_key_order,reverse_jaa_key_order),
      when(reverse_record_order,reverse_jaa_record_order),
      from_jaa_to[
        get_key_of_fn_to_convert_to(to,align_if_possible)
      ],
      convert_to_string_if_object
    )
  }
}
function get_key_of_fn_to_convert_to(to,align){
  if(!align)return to//user doesn't want to align
  if(from_jaa_to[to+'_aligned']!==undefined){
    return to+'_aligned'
  }
  else{ return to }
}
main.guess = guess_format
return main
})()