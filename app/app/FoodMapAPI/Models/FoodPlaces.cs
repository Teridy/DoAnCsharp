namespace FoodMapAPI.Models
{
    public class FoodPlaces
    {
        public int id { get; set; }
        public int narration_point_id { get; set; }
        public int category_id { get; set; }
        public string? price_range { get; set; }
        public string? opening_hours { get; set; }
        public string? description { get; set; }
    }
}
