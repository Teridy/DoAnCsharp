namespace FoodMapAPI.Models
{
    public class NarrationTranslation
    {
        public int id { get; set; }
        public int narration_point_id { get; set; }
        public string language_code { get; set; }
        public string content { get; set; }
        public DateTime? created_at { get; set; }
    }
}