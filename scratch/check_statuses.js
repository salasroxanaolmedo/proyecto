const supabase = require('./config/supabase');

async function checkStatuses() {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select('estatus_servicio');
  
  if (error) {
    console.error('Error fetching statuses:', error);
    return;
  }
  
  const uniqueStatuses = [...new Set(data.map(d => d.estatus_servicio))];
  console.log('Unique statuses in DB:', uniqueStatuses);
  process.exit(0);
}

checkStatuses();
