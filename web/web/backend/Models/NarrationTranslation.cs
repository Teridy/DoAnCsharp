using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("narration_translations")]
public class NarrationTranslation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("language_code")]
    public string LanguageCode { get; set; }
      [Column("language_id")]
    public int LanguageId { get; set; }

    [Column("content")]
    public string? Content { get; set; }

    [Column("narration_point_id")]
    public int NarrationPointId { get; set; }
    [Column("translated_name")]
    public string? TranslatedName { get; set; }
    
}
