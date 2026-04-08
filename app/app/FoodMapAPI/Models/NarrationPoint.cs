namespace FoodMapAPI.Models
{
    public class NarrationPoint
    {
        public int id { get; set; }
        public string? name { get; set; }
        public decimal latitude { get; set; }
        public decimal longitude { get; set; }
        public int activation_radius { get; set; }
        public int priority { get; set; }
        public bool is_active { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }
}
