using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;


[Table("narration_points")]
public class NarrationPoint
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("activation_radius")]
    public int ActivationRadius { get; set; }

    [Column("latitude")]
    public double? Latitude { get; set; }

    [Column("longitude")]
    public double? Longitude { get; set; }

    [Column("priority")]
    public int Priority { get; set; }

    [Column("is_active")]
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [Column("image_web")]
    public string? ImageWeb { get; set; }
    
    public List<Audio>? Audios { get; set; }
     [NotMapped] // 🔥 QUAN TRỌNG
    public IFormFile? Image { get; set; }
    [Column("is_commercial")] 
    public bool? IsCommercial { get; set; } = false;
}