// By + Copyright Greg Abbott V1 2020. V 2025_0222
let gebi =x=>document.getElementById(x)
let el = {}
let ids = [
  `input`,
  `output`,
  `transpose`,
  `reverse_key_order`,
  `reverse_record_order`,
  `align_if_possible`,
  `convert`,
  `guess`,
  `button_to_make_output_input`
]
ids.forEach(id=>{el[id]=gebi(id)})
function get_radio_value(n){
  
  return [...document.getElementsByName(n)]
  .filter(o=>o.checked)[0].value
}
const format_options={
  csv:"CSV (Comma separated values)",
  tsv:"TSV (Tab separated values)",
  html:"HTML table",
  ssv:"Space table",
  mdt:"Markdown table",
  md_gap:"Markdown lists",
  mdl_nested:"Markdown list nested",
  gsr:"Gap separated",
  jao:`JSON list of objects [{},{}]`,
  jaa:`JSON nested arrays [[keys],[R1],[R2]]`,
  jsdb:`JSON DB {"fields":{},"records":[{},{}]}`,
}
function make_radio_set({holder,options,checked}){
  const options_holder = gebi(holder)
    options_holder.classList.add('radio_options_holder')
  const group_name = holder.replace('_options','')
  Object.entries(options).forEach(([key,value])=>{
    let
    o_holder=options_holder.appendChild(document.createElement("div")),
    radio=o_holder.appendChild(document.createElement("input")),
    label=o_holder.appendChild(document.createElement("label"))
    radio.type='radio'
    radio.name=group_name
    radio.id=group_name+"_"+key
    radio.value=key
    radio.addEventListener('change',run)
    if(checked&&key===checked){radio.checked=true}
    label.innerText=value
    label.setAttribute('for',radio.id)
  })
  return options_holder
}
function run(){
  let opts={
    from:get_radio_value('input_format'),
    to:get_radio_value('output_format'),
    transpose:el.transpose.checked,
    reverse_key_order:el.reverse_key_order.checked,
    reverse_record_order:el.reverse_record_order.checked,
    align_if_possible:el.align_if_possible.checked,
  }
  //console.table(opts)
  el.output.value = pear_table(opts)(el.input.value)
}
el.input_format_options = make_radio_set({
  holder:'input_format_options',
  options:format_options,
  checked: 'ssv',
})
el.output_format_options = make_radio_set({
  holder:'output_format_options',
  options:format_options,
  checked:'ssv',
})
function after_paste(f){return el=>
  el.addEventListener('paste',ev=>{setTimeout(f,0)})
}
function guess_format(){
  let guess = pear_table.guess(el.input.value)
  if(!guess){
    alert(`Couldn't guess format`)
    return
  }
  let id_to_find = `input_format_${guess}`
  //console.log({guess,id_to_find})
  let option_element = gebi(id_to_find)
  if(option_element){option_element.click()}
  else{
    alert(
      `The front end lacks an element option to click`+
      `related to the guessed input format: "${id_to_find}"`
    )
  }
}
function save_txt_file({ name, data }) {
	const blob = new Blob([data], { type: "text/plain" })
	const link = document.createElement("a")
	link.href = URL.createObjectURL(blob)
	link.download = `${name}.txt`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}
function get_stamp() {
	return new Date()
		.toISOString()
		.replace(/[^\d]/g, "")
		.replace(/(\d{4})/g, "$1_")
		.substring(0, 14)
}
function copy(string, el) {
	navigator.clipboard
		.writeText(string)
		.then(() => {
			button_notice("Copied!")
		})
		.catch(err => {
			button_notice("Failed")
		})
	function button_notice(s) {
		let init = el.innerText
		el.innerText = s
		setTimeout(() => {
			el.innerText = init
		}, 1000)
	}
}
function onchange(f){return e=>e.addEventListener('change',f)}
function onclick(f){return e=>e.addEventListener('click',f)}
function save_input(){
	save_txt_file({
		name: get_stamp()+` input`,
    data: gebi("input").value,
	})
}
function save_output(){
  save_txt_file({
		name: get_stamp() + ` Converted Table Data`,
		data: gebi("output").value,
	})
}
function copy_input(e){copy(gebi("input").value, e.target)}
function copy_output(e){copy(gebi("output").value, e.target)}
let example_for_transpose=`
HUE     SHAPE   SIZE   PRICE
red     disc    big    10.00
pink    square  huge   50.00
blue    cone    small  2.00 
green   box     wide   6.00
`.trim()

let example={}
example.mdt=
`| On | Try |
|----------------------|----------------------|
| Paste | Guess format         |
| Choose wanted type | Convert|
| Transpose | Swap X and Y data|
| Set In + Out to same | Present (align) |`

example.json_table=`[
  ["Date", "Qty", "From", "To", "Note", "Cleared", "Cost"],
  ["24-09-01", 100, "A", "B", "Red",true,"1,000.50"],
  ["24-10-02", 50000, "B", "C", "Green",false,"5.00"],
  ["24-11-03", 1, "C", "A", "",null,"0.50"]
]`
function make_output_input(){
  el.input.value = el.output.value
  guess_format()
}
el.input.value = example.json_table
onclick(run)(el.convert)
onclick(guess_format)(el.guess)
onclick(save_input)(gebi("button_to_save_input"))
onclick(save_output)(gebi("button_to_save_output"))
onclick(copy_input)(gebi("button_to_copy_input"))
onclick(copy_output)(gebi("button_to_copy_output"))
onchange(run)(el.transpose)
onchange(run)(el.reverse_key_order)
onchange(run)(el.reverse_record_order)
onchange(run)(el.align_if_possible)
after_paste(guess_format)(el.input)
onclick(make_output_input)(el.button_to_make_output_input)
//AUTO:
guess_format()//guess based on current demo
