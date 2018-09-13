//consts
const _ = require('lodash');
const isBrowser = typeof window !== 'undefined';
const Vue = require('vue');
const Vuex = require('vuex');
const moment = require('moment');
const VueChartJs = require('vue-chartjs');
const axios = require('axios');
import DateRangePicker from 'vue2-daterange-picker';

//stores
Vue.use(Vuex);//Required for vuex
const store = new Vuex.Store({
    state: { //state def
        ratesData:{  //req. for rates data
            labels: [],
            values: []
        },
        activeFromPort: { //Origin port data
            label: 'Not Selected',
            value: null
        },
        activeToPort: { //Destination data
            label: 'Not Selected',
            value: null
        },
        startDate: moment().format('2017-08-30'), //Default Start Data
        endDate:  moment().format('YYYY-MM-DD') //Default End Date
    },
    mutations: {
        setActiveFromPort(state, port) { //mutation for Set Active Selected origin
            state.activeFromPort = port
        },
        setActiveToPort(state, port) { //mutation for Setting Active selected Destination
            state.activeToPort = port
        },
        setActiveDateRange(state,dates){ //mutation for setting active range start date & end date
            state.startDate = moment(dates.startDate).format('YYYY-MM-DD');
            state.endDate = moment(dates.endDate).format('YYYY-MM-DD');
        },
        setActiveData(state, data) { //mutation for setting active data range
            state.ratesData = data
        }
    }
});
if(isBrowser) { //Some components require to run under window env.. its better to define Vue under this - from my experience.
    const vSelect = require('vue-select') //select2
    Vue.component('v-select', vSelect.VueSelect); //select2 injection
    Vue.component('date-range-picker',DateRangePicker); //bootstrap daterange without jQuery WOW !injection

    Vue.component('line-chart', { //line chart comp injection
        extends: VueChartJs.Line,
        mixins: [VueChartJs.mixins.reactiveProp], //required for updating data.
        props: ['chartData', 'chartOptions'], //props
        mounted () { //init mount , it will render by default
            this.renderChart(this.chartData, this.options)
        }
    });
    new Vue({ //Magic vue
        el: "#app", //root
        store, //store
        data: { //data vars.
            chartOptions:{responsive: true, maintainAspectRatio:true}, //req for chart line
            chartData: { // req for chart line & its importing from store.
                labels: store.state.ratesData.labels,
                datasets: [
                    {
                        label: 'Prices over the time',
                        backgroundColor: '#f87979',
                        data: store.state.ratesData.values
                    }
                ]
            },
            optionsFromPort: [], //loading list for origin port
            optionsToPort: [], //loading list for destination port
            default_locale: { //locale for date range
                direction: 'ltr', //direction of text
                format: moment.localeData().longDateFormat('YYYY-MM-DD'), //fomart of the dates displayed
                separator: ' - ', //separator between the two ranges
                applyLabel: 'Apply',
                cancelLabel: 'Cancel',
                weekLabel: 'W',
                customRangeLabel: 'Custom Range',
                daysOfWeek: moment.weekdaysMin(), //array of days - see moment documenations for details
                monthNames: moment.monthsShort(), //array of month names - see moment documenations for details
                firstDay: moment.localeData().firstDayOfWeek() //ISO first day of week - see moment documenations for details
            },
            startDate: store.state.startDate, //additional var for startDate
            endDate: store.state.endDate, //additional var for endDate
        ratesData:{ //additional var for data rates.
                labels: [],
                values: []
            }
        },
        methods: {
            setActiveData(data) { //method to call mutation of  setActiveData
                this.$store.commit('setActiveData', data)
            },
            setActiveDateRange(value){ //method to call mutation of setActiveDateRange
                this.$store.commit('setActiveDateRange', value);
            },
            setActiveFromPort(port) { //method to call mutation setActiveFromPort
                this.$store.commit('setActiveFromPort', port)
            },
            onSearchFromPort(search, loading) { //method to manage calling search for origin port field
                loading(true); //loading...
                this.searchFromPort(loading, search, this); //call this function to bring data
            },
            searchFromPort: _.debounce((loading, search, vm) => { //_.debounce to manage overload of calling API while pressing keys many times
                axios.get( //magic axions
                    `/api/ports/search/${escape(search)}`
                ).then(res => {
                    vm.optionsFromPort = [];
                    res.data.results.forEach((item)=>{vm.optionsFromPort.push({value: item.id, label: item.name+` (${item.id})`})}) // parse & fill the data
                    loading(false); // Disable loading icon
                });
            }, 350),
            setActiveToPort(port) { //method to calll mutation of setActiveTo port
                this.$store.commit('setActiveToPort', port)
            },
            onSearchToPort(search, loading) {  //method to manage calling search for destination port field
                loading(true); //loadting..
                this.searchToPort(loading, search, this);  //call this function to bring data
            },
            searchToPort: _.debounce((loading, search, vm) => { //_.debounce to manage overload of calling API while pressing keys many times
                axios.get( //magic axions
                    `/api/ports/search/${escape(search)}`
                ).then(res => {
                    vm.optionsToPort = []; //rest to avoid duplication records.
                    res.data.results.forEach((item)=>{vm.optionsToPort.push({value: item.id, label: item.name+` (${item.id})`})}) //parse & fill the data of destination port field
                    loading(false); // Disable loading icon.
                });
            }, 350),
            getRates(){
                this.restData();//reset Graph Data
                const from = (this.$store.state.activeFromPort!=null)?this.$store.state.activeFromPort.value:null; // get origin active port from the store state
                const to = (this.$store.state.activeToPort!=null)?this.$store.state.activeToPort.value:null; // get the destination port from the store state
                const fromDate = this.$store.state.startDate; // Get the start date from the store state
                const toDate = this.$store.state.endDate; //Get End date from store state
                const ISO8601RegEx = /(\d{4})-(\d{2})-(\d{2})/;  //checking just in case the dates format
                if(!ISO8601RegEx.test(fromDate) || !ISO8601RegEx.test(toDate)) {
                    window.alert('Start Date: ' +fromDate + ', End Date'+toDate+ '\n Date(s) format should be like YYYY-MM-DD . ie 2018-05-31');
                return false; //exit from the proc.
                }
                axios.get( //magic axios will work only if everything goes well.
                    `/api/rates/${escape(from)}/${escape(to)}/${escape(fromDate)}/${escape(toDate)}`
                ).then(res => {
                   if(res.status === 200){ //status 200 means data fetched.
                     res.data.rates.forEach((item)=>{ // re-parsing for the graph
                         this.ratesData.labels.push(item[0]);
                         this.ratesData.values.push(item[1]);
                     });
                     if(this.isRatesDataReady()){ //check if data filled into arry
                     this.setActiveData(this.ratesData); //if yes , update the store
                     this.chartData = { //fill the chart data again from the store..
                         labels: this.$store.state.ratesData.labels,
                         datasets: [
                             {
                                 label: 'Prices over the time',
                                 backgroundColor: '#f87979',
                                 data: this.$store.state.ratesData.values
                             }
                         ]
                     }
                     }else{
                         alert('No Data found for selected fields'); //no data found
                       }
                     return true;
                    }
                }).catch(err=>{ // if error 400 , means a problem of date range , other errors also can be managed here.
                    if(err.code===400){
                        alert.alert('Wrong date period ! Start date should be < End Date');
                    }
                });
            },
            restData(){ // rest data rates method for the graph.
                this.ratesData.values = [];
                this.ratesData.labels = [];
                this.setActiveData(this.ratesData);
                this.chartData = {
                    labels: this.$store.state.ratesData.labels,
                    datasets: [
                        {
                            label: 'Prices over the time',
                            backgroundColor: '#f87979',
                            data: this.$store.state.ratesData.values
                        }
                    ]
                }
            },
            isRatesDataReady(){ //is the data ready to be shown on the graph
                return (this.ratesData.values.length > 0 && this.ratesData.labels.length === this.ratesData.values.length) // return true for label values should match labels length as data set. or return false if no match.
            }
        },
        computed: {
            store() { //important to use the store in ejs or front end core.
                return this.$store.state
            }
        }
    });
}